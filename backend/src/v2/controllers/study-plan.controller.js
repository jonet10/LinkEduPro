const prisma = require('../../config/prisma');
const { normalizeLevelInput, resolveStudentLevel, toApiLevel } = require('../utils/level');

function toApiStudyPlan(plan) {
  return {
    id: plan.id,
    level: toApiLevel(plan.level),
    subject: plan.subject,
    chapterOrder: plan.chapterOrder,
    title: plan.title,
    description: plan.description,
    notes: plan.notes,
    exercises: plan.exercises,
    createdBy: plan.creator
      ? {
          id: plan.creator.id,
          firstName: plan.creator.firstName,
          lastName: plan.creator.lastName,
          role: plan.creator.role
        }
      : null
  };
}

async function createStudyPlan(req, res, next) {
  try {
    const plan = await prisma.studyPlan.create({
      data: {
        level: normalizeLevelInput(req.body.level),
        subject: req.body.subject ? req.body.subject.trim() : null,
        chapterOrder: req.body.chapterOrder ?? null,
        title: req.body.title,
        description: req.body.description,
        notes: req.body.notes ? req.body.notes.trim() : null,
        exercises: req.body.exercises ? req.body.exercises.trim() : null,
        createdById: req.user.id
      },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, role: true }
        }
      }
    });

    return res.status(201).json({ studyPlan: toApiStudyPlan(plan) });
  } catch (error) {
    return next(error);
  }
}

async function listStudyPlans(req, res, next) {
  try {
    const where = {};
    if (req.query.level) {
      where.level = normalizeLevelInput(req.query.level);
    }
    if (req.query.subject) {
      where.subject = { contains: req.query.subject.trim(), mode: 'insensitive' };
    }

    const plans = await prisma.studyPlan.findMany({
      where,
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, role: true }
        }
      },
      orderBy: [{ subject: 'asc' }, { chapterOrder: 'asc' }, { id: 'asc' }]
    });
    return res.json({ plans: plans.map(toApiStudyPlan) });
  } catch (error) {
    return next(error);
  }
}

async function upsertPersonalStudyPlan(req, res, next) {
  try {
    const existing = await prisma.personalStudyPlan.findFirst({
      where: { userId: req.user.id },
      orderBy: { id: 'desc' }
    });

    const data = {
      customPreferences: req.body.customPreferences || null,
      examDate: req.body.examDate ? new Date(req.body.examDate) : null
    };

    let plan;
    if (existing) {
      plan = await prisma.personalStudyPlan.update({
        where: { id: existing.id },
        data
      });
    } else {
      plan = await prisma.personalStudyPlan.create({
        data: {
          userId: req.user.id,
          ...data
        }
      });
    }

    return res.json({ personalStudyPlan: plan });
  } catch (error) {
    return next(error);
  }
}

async function getMyStudyPlan(req, res, next) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.user.id },
      include: { studentProfile: true }
    });
    if (!student) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    const level = resolveStudentLevel(student);
    if (!level) {
      return res.status(400).json({ message: 'Niveau utilisateur non defini.' });
    }

    const [plans, personalStudyPlan] = await Promise.all([
      prisma.studyPlan.findMany({
        where: { level },
        include: {
          creator: {
            select: { id: true, firstName: true, lastName: true, role: true }
          }
        },
        orderBy: [{ subject: 'asc' }, { chapterOrder: 'asc' }, { id: 'asc' }]
      }),
      prisma.personalStudyPlan.findFirst({
        where: { userId: req.user.id },
        orderBy: { id: 'desc' }
      })
    ]);

    return res.json({
      level: toApiLevel(level),
      plans: plans.map(toApiStudyPlan),
      personalStudyPlan
    });
  } catch (error) {
    return next(error);
  }
}

async function updateStudyPlan(req, res, next) {
  try {
    const planId = Number(req.params.planId);
    const existing = await prisma.studyPlan.findUnique({
      where: { id: planId },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, role: true }
        }
      }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Plan introuvable.' });
    }

    const isAdmin = req.user.role === 'ADMIN';
    const isOwnerTeacher = req.user.role === 'TEACHER' && existing.createdById === req.user.id;
    if (!isAdmin && !isOwnerTeacher) {
      return res.status(403).json({ message: 'Action non autorisee.' });
    }

    const updated = await prisma.studyPlan.update({
      where: { id: planId },
      data: {
        level: req.body.level !== undefined ? normalizeLevelInput(req.body.level) : undefined,
        subject: req.body.subject !== undefined ? (req.body.subject ? req.body.subject.trim() : null) : undefined,
        chapterOrder: req.body.chapterOrder !== undefined ? (req.body.chapterOrder ?? null) : undefined,
        title: req.body.title !== undefined ? req.body.title : undefined,
        description: req.body.description !== undefined ? req.body.description : undefined,
        notes: req.body.notes !== undefined ? (req.body.notes ? req.body.notes.trim() : null) : undefined,
        exercises: req.body.exercises !== undefined ? (req.body.exercises ? req.body.exercises.trim() : null) : undefined
      },
      include: {
        creator: {
          select: { id: true, firstName: true, lastName: true, role: true }
        }
      }
    });

    return res.json({ studyPlan: toApiStudyPlan(updated) });
  } catch (error) {
    return next(error);
  }
}

async function deleteStudyPlan(req, res, next) {
  try {
    const planId = Number(req.params.planId);
    const existing = await prisma.studyPlan.findUnique({ where: { id: planId } });

    if (!existing) {
      return res.status(404).json({ message: 'Plan introuvable.' });
    }

    const isAdmin = req.user.role === 'ADMIN';
    const isOwnerTeacher = req.user.role === 'TEACHER' && existing.createdById === req.user.id;
    if (!isAdmin && !isOwnerTeacher) {
      return res.status(403).json({ message: 'Action non autorisee.' });
    }

    await prisma.studyPlan.delete({ where: { id: planId } });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createStudyPlan,
  listStudyPlans,
  upsertPersonalStudyPlan,
  getMyStudyPlan,
  updateStudyPlan,
  deleteStudyPlan
};
