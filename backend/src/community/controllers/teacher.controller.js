const path = require('path');
const prisma = require('../../config/prisma');
const { createCommunityLog } = require('../services/log.service');
const { evaluateUserBadges } = require('../services/badge-rules.service');

async function submitVerification(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Document requis.' });
    }

    const created = await prisma.teacherVerification.create({
      data: {
        teacherId: req.user.id,
        documentUrl: path.resolve(req.file.path),
        status: 'PENDING'
      }
    });

    await createCommunityLog({
      actorId: req.user.id,
      action: 'TEACHER_VERIFICATION_SUBMITTED',
      entityType: 'TeacherVerification',
      entityId: String(created.id)
    });

    return res.status(201).json({ verification: created });
  } catch (error) {
    return next(error);
  }
}

async function listMyVerifications(req, res, next) {
  try {
    const verifications = await prisma.teacherVerification.findMany({
      where: { teacherId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ verifications });
  } catch (error) {
    return next(error);
  }
}

async function listPendingVerifications(req, res, next) {
  try {
    const verifications = await prisma.teacherVerification.findMany({
      where: { status: 'PENDING' },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true, email: true, teacherLevel: true } }
      },
      orderBy: { createdAt: 'asc' }
    });

    return res.json({ verifications });
  } catch (error) {
    return next(error);
  }
}

async function reviewVerification(req, res, next) {
  try {
    const verificationId = Number(req.params.id);
    const { status } = req.body;

    const verification = await prisma.teacherVerification.findUnique({ where: { id: verificationId } });
    if (!verification) {
      return res.status(404).json({ message: 'Demande introuvable.' });
    }

    if (verification.status !== 'PENDING') {
      return res.status(400).json({ message: 'Demande deja traitee.' });
    }

    const reviewed = await prisma.teacherVerification.update({
      where: { id: verificationId },
      data: {
        status,
        reviewedBy: req.user.id
      }
    });

    if (status === 'APPROVED') {
      await prisma.student.update({
        where: { id: verification.teacherId },
        data: { teacherLevel: 'CERTIFIED' }
      });
      await evaluateUserBadges(verification.teacherId);
    }

    await createCommunityLog({
      actorId: req.user.id,
      action: `TEACHER_VERIFICATION_${status}`,
      entityType: 'TeacherVerification',
      entityId: String(verificationId),
      metadata: { teacherId: verification.teacherId }
    });

    return res.json({ verification: reviewed });
  } catch (error) {
    return next(error);
  }
}

async function updateTeacherLevel(req, res, next) {
  try {
    const teacherId = Number(req.params.teacherId);
    const { teacherLevel } = req.body;

    const teacher = await prisma.student.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      return res.status(404).json({ message: 'Professeur introuvable.' });
    }

    const updated = await prisma.student.update({
      where: { id: teacherId },
      data: { teacherLevel },
      select: { id: true, firstName: true, lastName: true, email: true, teacherLevel: true }
    });

    await evaluateUserBadges(teacherId);

    await createCommunityLog({
      actorId: req.user.id,
      action: 'TEACHER_LEVEL_UPDATED',
      entityType: 'Student',
      entityId: String(teacherId),
      metadata: { teacherLevel }
    });

    return res.json({ teacher: updated });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  submitVerification,
  listMyVerifications,
  listPendingVerifications,
  reviewVerification,
  updateTeacherLevel
};
