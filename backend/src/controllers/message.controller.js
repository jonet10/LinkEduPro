const prisma = require('../config/prisma');

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

async function sendPrivateMessage(req, res, next) {
  try {
    const senderId = req.user.id;
    const recipientId = Number(req.body.recipientId);
    const content = req.body.content.trim();

    if (senderId === recipientId) {
      return res.status(400).json({ message: 'Vous ne pouvez pas vous envoyer un message.' });
    }

    const recipient = await prisma.student.findUnique({
      where: { id: recipientId },
      select: { id: true }
    });

    if (!recipient) {
      return res.status(404).json({ message: 'Destinataire introuvable.' });
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
          content
        },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      });
    });

    return res.status(201).json({
      message: 'Message envoyé.',
      data: {
        id: message.id,
        conversationId: message.conversationId,
        content: message.content,
        createdAt: message.createdAt,
        sender: message.sender
      }
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
      orderBy: {
        conversation: {
          createdAt: 'desc'
        }
      }
    });

    const conversations = await Promise.all(
      memberships.map(async (membership) => {
        const unreadFilter = {
          conversationId: membership.conversationId,
          senderId: { not: userId },
          ...(membership.lastReadAt ? { createdAt: { gt: membership.lastReadAt } } : {})
        };

        const unreadCount = await prisma.message.count({ where: unreadFilter });
        return mapConversation(membership.conversation, unreadCount);
      })
    );

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
      return res.status(403).json({ message: 'Acces refuse a cette conversation.' });
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
    const content = req.body.content.trim();
    const audience = req.body.audience || 'ALL';

    let targetLevel = null;
    let recipientIds = [];

    if (audience === 'LEVEL') {
      targetLevel = API_LEVEL_TO_DB[req.body.level] || null;
      if (!targetLevel) {
        return res.status(400).json({ message: 'Niveau academique invalide.' });
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
          message: content.length > 160 ? `${content.slice(0, 157)}...` : content,
          entityType: 'Conversation',
          entityId: String(conversation.id)
        }))
    });

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

module.exports = {
  sendPrivateMessage,
  listConversations,
  getConversationById,
  sendGlobalMessage
};
