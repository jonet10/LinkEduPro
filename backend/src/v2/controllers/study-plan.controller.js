const prisma = require('../../config/prisma');
const { normalizeLevelInput, resolveStudentLevel, toApiLevel } = require('../utils/level');

function toApiStudyPlan(plan) {
  return {
    id: plan.id,
    level: toApiLevel(plan.level),
    title: plan.title,
    description: plan.description
  };
}

async function createStudyPlan(req, res, next) {
  try {
    const plan = await prisma.studyPlan.create({
      data: {
        level: normalizeLevelInput(req.body.level),
        title: req.body.title,
        description: req.body.description
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

    const plans = await prisma.studyPlan.findMany({ where, orderBy: { id: 'desc' } });
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
    const student = await prisma.student.findUnique({ where: { id: req.user.id } });
    if (!student) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    const level = resolveStudentLevel(student);
    if (!level) {
      return res.status(400).json({ message: 'Niveau utilisateur non defini.' });
    }

    const [plans, personalStudyPlan] = await Promise.all([
      prisma.studyPlan.findMany({ where: { level }, orderBy: { id: 'desc' } }),
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

module.exports = {
  createStudyPlan,
  listStudyPlans,
  upsertPersonalStudyPlan,
  getMyStudyPlan
};
