const prisma = require('../config/prisma');
const { emitRefresh } = require('../services/realtime');
const fs = require('fs');
const path = require('path');
const { resolveStoragePath } = require('../config/storage');
const PRIVATE_CONVERSATION_DB_VALUE = 'private';

const API_LEVEL_TO_DB = {
  '9e': 'LEVEL_9E',
  NSI: 'NSI',
  NSII: 'NSII',
  NSIII: 'NSIII',
  NSIV: 'NSIV',
  Universitaire: 'UNIVERSITAIRE'
};

function buildPrivateConversationKey(userA, userB) {
  const [minId, maxId] = [userA, userB].sort((a, b) => a - b);
  return `${minId}_${maxId}`;
}

function mapConversation(conversation, unreadCount = 0) {
  const lastMessage = conversation.messages?.[0] || null;

  return {
    id: conversation.id,
    type: conversation.type,
    targetLevel: conversation.targetLevel || null,
    createdAt: conversation.createdAt,
    unreadCount,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          content: lastMessage.content,
          attachments: Array.isArray(lastMessage.attachments) ? lastMessage.attachments : [],
          createdAt: lastMessage.createdAt,
          sender: {
            id: lastMessage.sender.id,
            firstName: lastMessage.sender.firstName,
            lastName: lastMessage.sender.lastName
          }
        }
      : null,
    participants: (conversation.participants || []).map((participant) => ({
      userId: participant.user.id,
      firstName: participant.user.firstName,
      lastName: participant.user.lastName,
      role: participant.user.role,
      lastReadAt: participant.lastReadAt
    }))
  };
}

function safeTrim(value) {
  return String(value || '').trim();
}

function toMessageAttachments(files) {
  const items = Array.isArray(files) ? files : [];
  return items
    .filter((file) => file && file.filename)
    .map((file) => ({
      originalName: String(file.originalname || '').slice(0, 260),
      storedName: String(file.filename || ''),
      mimeType: String(file.mimetype || ''),
      size: Number(file.size || 0),
      url: `/storage/message-files/${String(file.filename)}`
    }));
}

function removeStoredMessageFiles(attachments) {
  const list = Array.isArray(attachments) ? attachments : [];
  for (const att of list) {
    const storedName = att?.storedName || path.basename(String(att?.url || ''));
    if (!storedName) continue;
    const fullPath = resolveStoragePath('message-files', storedName);
    try {
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (_) {
      // best-effort cleanup
    }
  }
}

function resolveAllowedRecipientRoles(senderRole, roleFilter) {
  const normalizedFilter = String(roleFilter || '').trim().toUpperCase();

  // Restriction demandée : un élève ne peut pas contacter un autre élève.
  if (senderRole === 'STUDENT') {
    const allowed = ['TEACHER', 'ADMIN'];
    if (normalizedFilter && allowed.includes(normalizedFilter)) return [normalizedFilter];
    return allowed;
  }

  const allowedForStaff = ['STUDENT', 'TEACHER', 'ADMIN'];
  if (normalizedFilter && allowedForStaff.includes(normalizedFilter)) return [normalizedFilter];
  return allowedForStaff;
}

async function sendPrivateMessage(req, res, next) {
  try {
    const senderId = req.user.id;
    const senderRole = req.user.role;
    const recipientId = Number(req.body.recipientId);
    const content = safeTrim(req.body.content);
    const attachments = toMessageAttachments(req.files);

    if (!content && attachments.length === 0) {
      return res.status(400).json({ message: 'Message vide : texte ou fichier requis.' });
    }

    if (senderId === recipientId) {
      return res.status(400).json({ message: 'Vous ne pouvez pas vous envoyer un message.' });
    }

    const recipient = await prisma.student.findUnique({
      where: { id: recipientId },
      select: { id: true, role: true }
    });

    if (!recipient) {
      return res.status(404).json({ message: 'Destinataire introuvable.' });
    }

    if (senderRole === 'STUDENT' && recipient.role === 'STUDENT') {
      return res.status(403).json({ message: 'Les élèves ne peuvent pas contacter directement d’autres élèves.' });
    }

    const privateKey = buildPrivateConversationKey(senderId, recipientId);
    const now = new Date();

    const message = await prisma.$transaction(async (tx) => {
      const conversation = await tx.conversation.upsert({
        where: { privateKey },
        update: {},
        create: {
          type: 'PRIVATE',
          privateKey,
          participants: {
            create: [{ userId: senderId }, { userId: recipientId }]
          }
        },
        select: { id: true }
      });

      await tx.conversationParticipant.upsert({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: senderId
          }
        },
        update: { lastReadAt: now },
        create: { conversationId: conversation.id, userId: senderId, lastReadAt: now }
      });

      await tx.conversationParticipant.upsert({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: recipientId
          }
        },
        update: {},
        create: { conversationId: conversation.id, userId: recipientId }
      });

      return tx.message.create({
        data: {
          conversationId: conversation.id,
          senderId,
          content,
          attachments: attachments.length ? attachments : null
        },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      });
    });

    emitRefresh([senderId, recipientId], ['messages']);

    return res.status(201).json({
      message: 'Message envoyé.',
      data: {
        id: message.id,
        conversationId: message.conversationId,
        content: message.content,
        attachments: Array.isArray(message.attachments) ? message.attachments : [],
        createdAt: message.createdAt,
        sender: message.sender
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function listMessageRecipients(req, res, next) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const q = String(req.query.q || '').trim();
    const roleFilter = req.query.role;
    const requestedLimit = Number.parseInt(String(req.query.limit || ''), 10);
    const limit = Number.isInteger(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 5), 25)
      : 15;

    if (q.length < 2) {
      return res.json({ recipients: [] });
    }

    const terms = q.split(/\s+/).filter(Boolean).slice(0, 3);
    const whereByTerm = terms.map((term) => ({
      OR: [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { school: { contains: term, mode: 'insensitive' } }
      ]
    }));

    const recipients = await prisma.student.findMany({
      where: {
        id: { not: userId },
        role: { in: resolveAllowedRecipientRoles(userRole, roleFilter) },
        AND: whereByTerm
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        school: true,
        role: true
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      take: limit
    });

    return res.json({
      recipients: recipients.map((recipient) => ({
        id: recipient.id,
        firstName: recipient.firstName,
        lastName: recipient.lastName,
        school: recipient.school,
        role: recipient.role
      }))
    });
  } catch (error) {
    return next(error);
  }
}

async function getUnreadMessageSummary(req, res, next) {
  try {
    const userId = req.user.id;

    const [unreadMessagesRow, unreadConversationsRow] = await Promise.all([
      prisma.$queryRaw`
        SELECT COUNT(m.id)::int AS "unreadMessages"
        FROM conversation_participants cp
        INNER JOIN conversations c
          ON c.id = cp.conversation_id
         AND LOWER(c.type::text) = LOWER(${PRIVATE_CONVERSATION_DB_VALUE})
        INNER JOIN messages m
          ON m.conversation_id = cp.conversation_id
         AND m.sender_id <> cp.user_id
         AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
        WHERE cp.user_id = ${userId}
      `,
      prisma.$queryRaw`
        SELECT COUNT(*)::int AS "unreadConversations"
        FROM (
          SELECT cp.conversation_id
          FROM conversation_participants cp
          INNER JOIN conversations c
            ON c.id = cp.conversation_id
           AND LOWER(c.type::text) = LOWER(${PRIVATE_CONVERSATION_DB_VALUE})
          INNER JOIN messages m
            ON m.conversation_id = cp.conversation_id
           AND m.sender_id <> cp.user_id
           AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
          WHERE cp.user_id = ${userId}
          GROUP BY cp.conversation_id
        ) unread
      `
    ]);

    return res.json({
      unreadMessages: Number(unreadMessagesRow?.[0]?.unreadMessages || 0),
      unreadConversations: Number(unreadConversationsRow?.[0]?.unreadConversations || 0)
    });
  } catch (error) {
    return next(error);
  }
}

async function listConversations(req, res, next) {
  try {
    const userId = req.user.id;

    const memberships = await prisma.conversationParticipant.findMany({
      where: { userId },
      select: {
        conversationId: true,
        lastReadAt: true,
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    role: true
                  }
                }
              }
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: {
                sender: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { conversationId: 'desc' }
    });

    const unreadRows = await prisma.$queryRaw`
      SELECT
        cp.conversation_id AS "conversationId",
        COUNT(m.id)::int AS "unreadCount"
      FROM conversation_participants cp
      LEFT JOIN messages m
        ON m.conversation_id = cp.conversation_id
       AND m.sender_id <> cp.user_id
       AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at)
      WHERE cp.user_id = ${userId}
      GROUP BY cp.conversation_id
    `;

    const unreadCountByConversation = new Map(
      unreadRows.map((row) => [Number(row.conversationId), Number(row.unreadCount || 0)])
    );

    const conversations = memberships
      .map((membership) => mapConversation(
        membership.conversation,
        unreadCountByConversation.get(membership.conversationId) || 0
      ))
      .sort((a, b) => {
        const aTime = new Date(a.lastMessage?.createdAt || a.createdAt).getTime();
        const bTime = new Date(b.lastMessage?.createdAt || b.createdAt).getTime();
        return bTime - aTime;
      });

    return res.json({ conversations });
  } catch (error) {
    return next(error);
  }
}

async function getConversationById(req, res, next) {
  try {
    const userId = req.user.id;
    const conversationId = Number(req.params.id);

    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({ message: 'Conversation invalide.' });
    }

    const membership = await prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      }
    });

    if (!membership) {
      return res.status(403).json({ message: 'Accès refusé à cette conversation.' });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation introuvable.' });
    }

    await prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId
        }
      },
      data: { lastReadAt: new Date() }
    });

    return res.json({
      conversation: {
        id: conversation.id,
        type: conversation.type,
        targetLevel: conversation.targetLevel || null,
        createdAt: conversation.createdAt,
        participants: conversation.participants.map((participant) => ({
          userId: participant.user.id,
          firstName: participant.user.firstName,
          lastName: participant.user.lastName,
          role: participant.user.role,
          lastReadAt: participant.lastReadAt
        })),
        messages: conversation.messages.map((message) => ({
          id: message.id,
          content: message.content,
          attachments: Array.isArray(message.attachments) ? message.attachments : [],
          createdAt: message.createdAt,
          sender: message.sender
        }))
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function sendGlobalMessage(req, res, next) {
  try {
    const senderId = req.user.id;
    const content = safeTrim(req.body.content);
    const attachments = toMessageAttachments(req.files);
    const audience = req.body.audience || 'ALL';

    if (!content && attachments.length === 0) {
      return res.status(400).json({ message: 'Annonce vide : texte ou fichier requis.' });
    }

    let targetLevel = null;
    let recipientIds = [];

    if (audience === 'LEVEL') {
      targetLevel = API_LEVEL_TO_DB[req.body.level] || null;
      if (!targetLevel) {
        return res.status(400).json({ message: 'Niveau académique invalide.' });
      }

      const profiles = await prisma.studentProfile.findMany({
        where: { level: targetLevel },
        select: { userId: true }
      });

      recipientIds = profiles.map((profile) => profile.userId);
    } else {
      const users = await prisma.student.findMany({
        select: { id: true }
      });
      recipientIds = users.map((user) => user.id);
    }

    if (recipientIds.length === 0) {
      return res.status(400).json({ message: 'Aucun destinataire pour cette annonce.' });
    }

    const uniqueRecipientIds = Array.from(new Set([...recipientIds, senderId]));
    const now = new Date();

    const conversation = await prisma.$transaction(async (tx) => {
      const createdConversation = await tx.conversation.create({
        data: {
          type: 'GLOBAL',
          targetLevel,
          participants: {
            createMany: {
              data: uniqueRecipientIds.map((userId) => ({ userId }))
            }
          },
          messages: {
            create: {
              senderId,
              content,
              attachments: attachments.length ? attachments : null,
              createdAt: now
            }
          }
        },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: {
              sender: {
                select: { id: true, firstName: true, lastName: true }
              }
            }
          }
        }
      });

      await tx.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId: createdConversation.id,
            userId: senderId
          }
        },
        data: { lastReadAt: now }
      });

      return createdConversation;
    });

    await prisma.userNotification.createMany({
      data: uniqueRecipientIds
        .filter((userId) => userId !== senderId)
        .map((userId) => ({
          userId,
          type: 'GLOBAL_ANNOUNCEMENT',
          title: 'Nouvelle annonce',
          message: content
            ? (content.length > 160 ? `${content.slice(0, 157)}...` : content)
            : 'Nouvelle annonce (pièce jointe).',
          entityType: 'Conversation',
          entityId: String(conversation.id)
        }))
    });

    emitRefresh(uniqueRecipientIds, ['notifications', 'messages']);

    return res.status(201).json({
      message: 'Annonce envoyée.',
      conversation: {
        id: conversation.id,
        type: conversation.type,
        targetLevel: conversation.targetLevel || null,
        createdAt: conversation.createdAt,
        recipientsCount: uniqueRecipientIds.length,
        announcement: conversation.messages[0]
          ? {
              id: conversation.messages[0].id,
              content: conversation.messages[0].content,
              attachments: Array.isArray(conversation.messages[0].attachments) ? conversation.messages[0].attachments : [],
              createdAt: conversation.messages[0].createdAt,
              sender: conversation.messages[0].sender
            }
          : null
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteConversation(req, res, next) {
  try {
    const userId = req.user.id;
    const conversationId = Number(req.params.id);

    if (!Number.isInteger(conversationId) || conversationId <= 0) {
      return res.status(400).json({ message: 'Conversation invalide.' });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          select: { userId: true }
        }
      }
    });

    if (!conversation) {
      return res.status(404).json({ message: 'Conversation introuvable.' });
    }

    const participantIds = conversation.participants.map((p) => p.userId);
    if (!participantIds.includes(userId)) {
      return res.status(403).json({ message: 'Accès refusé à cette conversation.' });
    }

    await prisma.$transaction(async (tx) => {
      if (conversation.type === 'PRIVATE') {
        await tx.conversation.delete({ where: { id: conversationId } });
        return;
      }

      await tx.conversationParticipant.delete({
        where: {
          conversationId_userId: {
            conversationId,
            userId
          }
        }
      });

      const remaining = await tx.conversationParticipant.count({
        where: { conversationId }
      });

      if (remaining === 0) {
        await tx.conversation.delete({ where: { id: conversationId } });
      }
    });

    emitRefresh(participantIds, ['messages']);
    return res.json({ message: 'Conversation supprimée.' });
  } catch (error) {
    return next(error);
  }
}

async function deleteMessage(req, res, next) {
  try {
    const userId = req.user.id;
    const messageId = Number(req.params.messageId);

    if (!Number.isInteger(messageId) || messageId <= 0) {
      return res.status(400).json({ message: 'Message invalide.' });
    }

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        conversationId: true,
        attachments: true,
        conversation: {
          select: {
            participants: {
              select: { userId: true }
            }
          }
        }
      }
    });

    if (!message) {
      return res.status(404).json({ message: 'Message introuvable.' });
    }

    const participantIds = (message.conversation?.participants || []).map((p) => p.userId);
    if (!participantIds.includes(userId)) {
      return res.status(403).json({ message: 'Accès refusé à ce message.' });
    }

    const canDelete = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN' || message.senderId === userId;
    if (!canDelete) {
      return res.status(403).json({ message: 'Action non autorisée.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.message.delete({ where: { id: messageId } });

      const remainingMessages = await tx.message.count({
        where: { conversationId: message.conversationId }
      });

      if (remainingMessages === 0) {
        await tx.conversation.delete({ where: { id: message.conversationId } });
      }
    });

    removeStoredMessageFiles(message.attachments);

    emitRefresh(participantIds, ['messages']);
    return res.json({ message: 'Message supprimé.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listMessageRecipients,
  getUnreadMessageSummary,
  sendPrivateMessage,
  listConversations,
  getConversationById,
  sendGlobalMessage,
  deleteConversation,
  deleteMessage
};
