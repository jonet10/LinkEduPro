const prisma = require('../../config/prisma');
const { normalizeLevelInput, resolveStudentLevel, toApiLevel } = require('../utils/level');

const STATUS_BY_ACTION = {
  approved: 'APPROVED',
  rejected: 'REJECTED'
};

function toApiContent(content) {
  return {
    id: content.id,
    title: content.title,
    body: content.body,
    level: toApiLevel(content.level),
    type: content.type.toLowerCase(),
    status: content.status.toLowerCase(),
    teacherId: content.teacherId,
    createdAt: content.createdAt
  };
}

async function createContent(req, res, next) {
  try {
    const level = normalizeLevelInput(req.body.level);
    const type = req.body.type.toUpperCase();

    let status = 'PENDING';
    if (req.user.role === 'ADMIN' && req.body.status) {
      status = req.body.status.toUpperCase();
    }

    const content = await prisma.content.create({
      data: {
        title: req.body.title,
        body: req.body.body,
        level,
        type,
        status,
        teacherId: req.user.id
      }
    });

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
      return res.status(400).json({ message: 'Niveau utilisateur non defini.' });
    }

    const contents = await prisma.content.findMany({
      where: {
        level,
        status: 'APPROVED'
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

module.exports = {
  createContent,
  listMySubmittedContent,
  listApprovedForMyLevel,
  listPendingContent,
  reviewContent
};
