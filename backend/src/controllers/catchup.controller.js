const prisma = require('../config/prisma');
const {
  listSessions,
  createSession,
  updateSession,
  deleteSession,
  enrollStudent,
  payForSession,
  createMoncashCheckout,
  teacherDashboard,
  studentDashboard
} = require('../services/remedial.service');

function toInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

async function listCatchupSessions(req, res, next) {
  try {
    const viewer = await prisma.student.findUnique({
      where: { id: req.user.id },
      include: { studentProfile: true }
    });
    if (!viewer) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    const page = toInt(req.query.page, 1);
    const pageSize = toInt(req.query.pageSize, 20);

    const data = await listSessions({
      viewer,
      page,
      pageSize,
      level: typeof req.query.level === 'string' ? req.query.level : undefined,
      subject: typeof req.query.subject === 'string' ? req.query.subject : undefined
    });
    return res.json(data);
  } catch (error) {
    return next(error);
  }
}

async function listTargetTeachers(req, res, next) {
  try {
    const actor = await prisma.student.findUnique({
      where: { id: req.user.id },
      select: { role: true, school: true }
    });

    if (!actor || !['ADMIN', 'TEACHER'].includes(actor.role)) {
      return res.status(403).json({ message: 'Action non autorisée.' });
    }

    const teachers = await prisma.student.findMany({
      where: {
        role: 'TEACHER',
        emailVerified: true,
        ...(actor.role === 'TEACHER' && actor.school ? { school: actor.school } : {})
      },
      select: { id: true, firstName: true, lastName: true, school: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }]
    });

    return res.json({ teachers });
  } catch (error) {
    return next(error);
  }
}

async function createCatchupSession(req, res, next) {
  try {
    const actor = await prisma.student.findUnique({
      where: { id: req.user.id },
      select: { id: true, role: true }
    });
    if (!actor) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    const result = await createSession({ actor, payload: req.body });
    if (!result.ok) return res.status(result.status).json({ message: result.message });

    return res.status(201).json({
      message: 'Session de rattrapage créée.',
      id: result.createdId,
      notifiedCount: result.notifiedCount
    });
  } catch (error) {
    return next(error);
  }
}

async function updateCatchupSession(req, res, next) {
  try {
    const actor = await prisma.student.findUnique({
      where: { id: req.user.id },
      select: { id: true, role: true }
    });
    if (!actor) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    const sessionId = Number(req.params.id);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return res.status(400).json({ message: 'Session invalide.' });
    }

    const result = await updateSession({ actor, sessionId, payload: req.body });
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    return res.json({ message: 'Session mise à jour.' });
  } catch (error) {
    return next(error);
  }
}

async function deleteCatchupSession(req, res, next) {
  try {
    const actor = await prisma.student.findUnique({
      where: { id: req.user.id },
      select: { id: true, role: true }
    });
    if (!actor) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    const sessionId = Number(req.params.id);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return res.status(400).json({ message: 'Session invalide.' });
    }

    const result = await deleteSession({ actor, sessionId });
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function enrollInCatchupSession(req, res, next) {
  try {
    const sessionId = Number(req.params.id);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return res.status(400).json({ message: 'Session invalide.' });
    }

    const result = await enrollStudent({ student: req.user, sessionId });
    if (!result.ok) return res.status(result.status).json({ message: result.message });

    return res.status(201).json({
      message: result.message,
      enrollment: result.enrollment,
      requiresPayment: result.requiresPayment
    });
  } catch (error) {
    return next(error);
  }
}

async function payCatchupSession(req, res, next) {
  try {
    const sessionId = Number(req.params.id);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return res.status(400).json({ message: 'Session invalide.' });
    }

    let result;
    if (req.body.paymentMethod === 'MONCASH') {
      result = await createMoncashCheckout({
        student: req.user,
        sessionId,
        amount: req.body.amount
      });
      if (!result.ok) return res.status(result.status).json({ message: result.message });
      if (result.alreadyPaid) return res.json({ message: result.message });
      return res.status(202).json({
        message: 'Redirection MonCash requise.',
        provider: 'MONCASH',
        redirectUrl: result.redirectUrl,
        orderId: result.orderId
      });
    }

    result = await payForSession({
      student: req.user,
      sessionId,
      paymentMethod: req.body.paymentMethod,
      amount: req.body.amount
    });
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    return res.json({ message: result.message });
  } catch (error) {
    return next(error);
  }
}

async function getTeacherCatchupDashboard(req, res, next) {
  try {
    const result = await teacherDashboard(req.user.id);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    return res.json(result.data);
  } catch (error) {
    return next(error);
  }
}

async function getStudentCatchupDashboard(req, res, next) {
  try {
    const page = toInt(req.query.page, 1);
    const pageSize = toInt(req.query.pageSize, 10);
    const result = await studentDashboard(req.user.id, {
      page,
      pageSize,
      level: typeof req.query.level === 'string' ? req.query.level : undefined,
      subject: typeof req.query.subject === 'string' ? req.query.subject : undefined
    });
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    return res.json(result.data);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listCatchupSessions,
  listTargetTeachers,
  createCatchupSession,
  updateCatchupSession,
  deleteCatchupSession,
  enrollInCatchupSession,
  payCatchupSession,
  getTeacherCatchupDashboard,
  getStudentCatchupDashboard
};
