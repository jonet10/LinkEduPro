const prisma = require('../../config/prisma');
const { normalizeLevelInput, resolveStudentLevel, toApiLevel } = require('../utils/level');
const { notifyAdmins } = require('../../services/notifications');

const STATUS_BY_ACTION = {
  approved: 'APPROVED',
  rejected: 'REJECTED'
};

function toApiContent(content) {
  const levels = Array.isArray(content.targetLevels) && content.targetLevels.length
    ? content.targetLevels
    : (content.level ? [content.level] : []);
  return {
    id: content.id,
    title: content.title,
    body: content.body,
    level: toApiLevel(content.level),
    levels: levels.map(toApiLevel).filter(Boolean),
    type: content.type.toLowerCase(),
    status: content.status.toLowerCase(),
    teacherId: content.teacherId,
    createdAt: content.createdAt
  };
}

async function createContent(req, res, next) {
  try {
    const requestedLevels = Array.isArray(req.body.levels) ? req.body.levels : [];
    const normalizedLevels = [
      ...requestedLevels,
      ...(req.body.level ? [req.body.level] : [])
    ]
      .map((entry) => normalizeLevelInput(entry))
      .filter(Boolean);
    const uniqueLevels = Array.from(new Set(normalizedLevels));
    const level = uniqueLevels[0] || normalizeLevelInput(req.body.level) || 'TERMINALE';
    const type = req.body.type.toUpperCase();

    let status = 'PENDING';
    if (req.user.role === 'ADMIN') {
      // Admin publications should be visible immediately unless explicitly set otherwise.
      status = req.body.status ? req.body.status.toUpperCase() : 'APPROVED';
    }

    const content = await prisma.content.create({
      data: {
        title: req.body.title,
        body: req.body.body,
        level,
        targetLevels: uniqueLevels,
        type,
        status,
        teacherId: req.user.id
      }
    });

    if (status === 'PENDING') {
      await notifyAdmins({
        type: 'CONTENT_REVIEW_REQUIRED',
        title: 'Vidéo à valider',
        message: `${content.title} a été soumis et attend validation.`,
        entityType: 'Content',
        entityId: String(content.id)
      });
    }

    return res.status(201).json({ content: toApiContent(content) });
  } catch (error) {
    return next(error);
  }
}

async function listMySubmittedContent(req, res, next) {
  try {
    const contents = await prisma.content.findMany({
      where: { teacherId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ contents: contents.map(toApiContent) });
  } catch (error) {
    return next(error);
  }
}

async function listApprovedForMyLevel(req, res, next) {
  try {
    const student = await prisma.student.findUnique({ where: { id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    const level = resolveStudentLevel(student);
    if (!level) {
      return res.status(400).json({ message: 'Niveau utilisateur non défini.' });
    }

    const contents = await prisma.content.findMany({
      where: {
        status: 'APPROVED',
        OR: [
          // If explicit targetLevels exist, they are the source of truth.
          { targetLevels: { has: level } },
          // Backward compatible: older rows without targetLevels use the single level field.
          { AND: [{ targetLevels: { isEmpty: true } }, { level }] }
        ]
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({
      level: toApiLevel(level),
      contents: contents.map(toApiContent)
    });
  } catch (error) {
    return next(error);
  }
}

async function listPendingContent(req, res, next) {
  try {
    const contents = await prisma.content.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    return res.json({
      pending: contents.map((item) => ({
        ...toApiContent(item),
        teacher: item.teacher
      }))
    });
  } catch (error) {
    return next(error);
  }
}

async function reviewContent(req, res, next) {
  try {
    const contentId = Number(req.params.contentId);
    if (!Number.isInteger(contentId) || contentId <= 0) {
      return res.status(400).json({ message: 'Identifiant de contenu invalide.' });
    }

    const action = req.body.action;
    const nextStatus = STATUS_BY_ACTION[action];

    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) {
      return res.status(404).json({ message: 'Contenu introuvable.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.content.update({
        where: { id: contentId },
        data: { status: nextStatus }
      });

      await tx.approvalLog.create({
        data: {
          contentId,
          adminId: req.user.id,
          action
        }
      });

      return saved;
    });

    return res.json({ content: toApiContent(updated) });
  } catch (error) {
    return next(error);
  }
}

async function updateContent(req, res, next) {
  try {
    const contentId = Number(req.params.contentId);
    if (!Number.isInteger(contentId) || contentId <= 0) {
      return res.status(400).json({ message: 'Identifiant de contenu invalide.' });
    }

    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) {
      return res.status(404).json({ message: 'Contenu introuvable.' });
    }

    const isAdmin = req.user.role === 'ADMIN';
    if (!isAdmin && content.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Permissions insuffisantes.' });
    }

    const data = {};
    const requestedTitle = req.body.title;
    const requestedBody = req.body.body;

    if (typeof requestedTitle === 'string') {
      data.title = requestedTitle;
    }

    if (typeof requestedBody === 'string') {
      data.body = requestedBody;
    }

    const requestedLevels = Array.isArray(req.body.levels) ? req.body.levels : [];
    const normalizedLevels = [
      ...requestedLevels,
      ...(req.body.level ? [req.body.level] : [])
    ]
      .map((entry) => normalizeLevelInput(entry))
      .filter(Boolean);
    const uniqueLevels = Array.from(new Set(normalizedLevels));
    if (uniqueLevels.length) {
      data.level = uniqueLevels[0];
      data.targetLevels = uniqueLevels;
    } else if (typeof req.body.level === 'string') {
      const normalized = normalizeLevelInput(req.body.level);
      if (normalized) {
        data.level = normalized;
      }
    }

    if (isAdmin && typeof req.body.status === 'string' && req.body.status) {
      data.status = String(req.body.status).toUpperCase();
    }

    const teacherChangedContent = !isAdmin && Object.keys(data).some((key) => ['title', 'body', 'level', 'targetLevels'].includes(key));
    if (teacherChangedContent && content.status === 'APPROVED') {
      data.status = 'PENDING';
    }

    const updated = await prisma.content.update({
      where: { id: contentId },
      data
    });

    return res.json({ content: toApiContent(updated) });
  } catch (error) {
    return next(error);
  }
}

async function deleteContent(req, res, next) {
  try {
    const contentId = Number(req.params.contentId);
    if (!Number.isInteger(contentId) || contentId <= 0) {
      return res.status(400).json({ message: 'Identifiant de contenu invalide.' });
    }

    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) {
      return res.status(404).json({ message: 'Contenu introuvable.' });
    }

    const isAdmin = req.user.role === 'ADMIN';
    if (!isAdmin && content.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Permissions insuffisantes.' });
    }

    await prisma.content.delete({ where: { id: contentId } });

    return res.json({ message: 'Contenu supprimé.', id: contentId });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createContent,
  listMySubmittedContent,
  listApprovedForMyLevel,
  listPendingContent,
  reviewContent,
  updateContent,
  deleteContent
};
