const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const { emitRefresh } = require('./realtime');

const COMMISSION_RATE_RAW = Number(process.env.REMEDIAL_COMMISSION_RATE ?? '0.1');
const COMMISSION_RATE = Number.isFinite(COMMISSION_RATE_RAW)
  ? Math.min(Math.max(COMMISSION_RATE_RAW, 0), 0.95)
  : 0.1;

function decimal(value) {
  return new Prisma.Decimal(value || 0);
}

function toAcademicFromEducation(level) {
  if (!level) return null;
  if (level === 'LEVEL_9E' || level === '9e') return 'LEVEL_9E';
  if (level === 'NS1') return 'NSI';
  if (level === 'NS2') return 'NSII';
  if (level === 'NS3') return 'NSIII';
  if (level === 'TERMINALE' || level === 'NSIV') return 'NSIV';
  if (level === 'UNIVERSITE' || level === 'UNIVERSITAIRE' || level === 'Universitaire') return 'UNIVERSITAIRE';
  return null;
}

function getAcademicLevel(student) {
  return student?.studentProfile?.level || toAcademicFromEducation(student?.level) || null;
}

function normalizeSessionPayload(input) {
  const startTime = input.startTime || input.startsAt;
  let duration = input.duration;

  if (!duration && input.startsAt && input.endsAt) {
    const start = new Date(input.startsAt);
    const end = new Date(input.endsAt);
    duration = Math.round((end.getTime() - start.getTime()) / 60000);
  }

  const isFree = typeof input.isFree === 'boolean'
    ? input.isFree
    : Number(input.price || 0) <= 0;

  return {
    title: input.title?.trim(),
    description: input.description ? input.description.trim() : null,
    level: input.level || 'NSIV',
    subject: input.subject?.trim(),
    isFree,
    price: isFree ? 0 : Number(input.price),
    maxParticipants: Number(input.maxParticipants || 60),
    meetingLink: (input.meetingLink || input.meetUrl || '').trim(),
    startTime,
    duration: Number(duration),
    invitationScope: input.invitationScope || 'GLOBAL',
    targetSchool: input.targetSchool ? input.targetSchool.trim() : null,
    targetTeacherId: input.targetTeacherId ? Number(input.targetTeacherId) : null,
    invitationMessage: input.invitationMessage ? input.invitationMessage.trim() : null
  };
}

function isSessionExpired(session) {
  const end = new Date(session.startTime).getTime() + Number(session.duration || 0) * 60000;
  return Date.now() > end;
}

function mapSessionForResponse(session, enrollment) {
  const startsAt = session.startTime;
  const endsAt = new Date(new Date(session.startTime).getTime() + Number(session.duration || 0) * 60000);

  return {
    id: session.id,
    title: session.title,
    description: session.description,
    level: session.level,
    subject: session.subject,
    isFree: Boolean(session.isFree),
    price: Number(session.price || 0),
    maxParticipants: session.maxParticipants,
    meetingLink: session.meetingLink,
    meetUrl: session.meetingLink,
    startTime: startsAt,
    startsAt,
    duration: session.duration,
    endsAt,
    status: session.status,
    invitationScope: session.invitationScope,
    targetSchool: session.targetSchool,
    targetTeacherId: session.targetTeacherId,
    invitationMessage: session.invitationMessage,
    createdAt: session.createdAt,
    createdBy: session.teacher
      ? {
        id: session.teacher.id,
        firstName: session.teacher.firstName,
        lastName: session.teacher.lastName
      }
      : null,
    targetTeacherName: session.targetTeacher
      ? `${session.targetTeacher.firstName || ''} ${session.targetTeacher.lastName || ''}`.trim()
      : null,
    enrolledCount: session._count?.enrollments || 0,
    spotsLeft: Math.max(0, Number(session.maxParticipants || 0) - Number(session._count?.enrollments || 0)),
    enrollment: enrollment
      ? {
        id: enrollment.id,
        paymentStatus: enrollment.paymentStatus,
        accessGranted: enrollment.accessGranted,
        createdAt: enrollment.createdAt
      }
      : null
  };
}

function buildStudentVisibilityFilter(student) {
  const level = getAcademicLevel(student);
  if (!level) return { id: { in: [] } };

  return {
    status: 'SCHEDULED',
    level,
    OR: [
      { invitationScope: 'GLOBAL' },
      {
        invitationScope: 'SCHOOL',
        targetSchool: student.school || null
      }
    ]
  };
}

function buildTeacherVisibilityFilter(student) {
  return {
    OR: [
      { teacherId: student.id },
      { invitationScope: 'GLOBAL' },
      { invitationScope: 'TEACHERS' },
      { invitationScope: 'TEACHER', targetTeacherId: student.id },
      { invitationScope: 'SCHOOL', targetSchool: student.school || null }
    ]
  };
}

async function syncSessionStatuses() {
  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE remedial_sessions
      SET status = CAST('COMPLETED' AS "RemedialSessionStatus"), updated_at = CURRENT_TIMESTAMP
      WHERE status = CAST('SCHEDULED' AS "RemedialSessionStatus")
        AND (start_time + (duration || ' minutes')::interval) <= NOW()
    `
  );
}

async function listSessions({ viewer, page = 1, pageSize = 20, level, subject }) {
  await syncSessionStatuses();

  const whereBase = {
    ...(level ? { level } : {}),
    ...(subject ? { subject: { contains: subject, mode: 'insensitive' } } : {})
  };

  let where = whereBase;
  if (viewer.role === 'STUDENT') {
    where = { ...whereBase, ...buildStudentVisibilityFilter(viewer) };
  } else if (viewer.role === 'TEACHER') {
    where = { ...whereBase, ...buildTeacherVisibilityFilter(viewer) };
  }

  const skip = (Math.max(page, 1) - 1) * Math.max(pageSize, 1);
  const take = Math.min(Math.max(pageSize, 1), 100);

  const include = {
    teacher: { select: { id: true, firstName: true, lastName: true } },
    targetTeacher: { select: { firstName: true, lastName: true } },
    _count: { select: { enrollments: true } }
  };
  if (viewer.role === 'STUDENT') {
    include.enrollments = { where: { studentId: viewer.id }, take: 1 };
  }

  const [total, sessions] = await Promise.all([
    prisma.remedialSession.count({ where }),
    prisma.remedialSession.findMany({
      where,
      skip,
      take,
      orderBy: [{ startTime: 'asc' }],
      include
    })
  ]);

  return {
    total,
    page: Math.max(page, 1),
    pageSize: take,
    sessions: sessions.map((session) => {
      const enrollment = Array.isArray(session.enrollments) ? session.enrollments[0] : null;
      const mapped = mapSessionForResponse(session, enrollment);

      let canAccessMeeting = false;
      if (viewer.role === 'ADMIN') canAccessMeeting = true;
      if (viewer.role === 'TEACHER' && session.teacherId === viewer.id) canAccessMeeting = true;
      if (viewer.role === 'STUDENT' && enrollment && enrollment.paymentStatus === 'PAID' && enrollment.accessGranted) {
        canAccessMeeting = true;
      }

      return {
        ...mapped,
        canAccessMeeting,
        meetingLink: canAccessMeeting ? mapped.meetingLink : null,
        meetUrl: canAccessMeeting ? mapped.meetUrl : null
      };
    })
  };
}

async function createSession({ actor, payload }) {
  if (actor.role !== 'TEACHER' && actor.role !== 'ADMIN') {
    return { ok: false, status: 403, message: 'Seuls les professeurs peuvent créer une session.' };
  }

  const data = normalizeSessionPayload(payload);
  if (!data.title || !data.subject || !data.meetingLink || !data.startTime || !data.duration) {
    return { ok: false, status: 400, message: 'Champs requis manquants.' };
  }
  if (!['LEVEL_9E', 'NSI', 'NSII', 'NSIII', 'NSIV', 'UNIVERSITAIRE'].includes(data.level)) {
    return { ok: false, status: 400, message: 'Niveau invalide.' };
  }
  if (!Number.isFinite(data.duration) || data.duration < 15) {
    return { ok: false, status: 400, message: 'Durée invalide (minimum 15 minutes).' };
  }
  if (!Number.isFinite(data.maxParticipants) || data.maxParticipants <= 0) {
    return { ok: false, status: 400, message: 'Nombre maximum de participants invalide.' };
  }
  if (!data.isFree && (!Number.isFinite(data.price) || data.price <= 0)) {
    return { ok: false, status: 400, message: 'Prix obligatoire pour une session payante.' };
  }

  const start = new Date(data.startTime);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, status: 400, message: 'Date de début invalide.' };
  }

  if (data.invitationScope === 'SCHOOL' && !data.targetSchool) {
    return { ok: false, status: 400, message: 'École cible requise.' };
  }
  if (data.invitationScope === 'TEACHER') {
    if (!data.targetTeacherId) {
      return { ok: false, status: 400, message: 'Professeur cible requis.' };
    }
    const targetTeacher = await prisma.student.findFirst({
      where: { id: data.targetTeacherId, role: 'TEACHER' },
      select: { id: true }
    });
    if (!targetTeacher) {
      return { ok: false, status: 404, message: 'Professeur cible introuvable.' };
    }
  }

  const created = await prisma.remedialSession.create({
    data: {
      teacherId: actor.id,
      title: data.title,
      description: data.description,
      level: data.level,
      subject: data.subject,
      isFree: data.isFree,
      price: decimal(data.price || 0),
      maxParticipants: data.maxParticipants,
      meetingLink: data.meetingLink,
      startTime: start,
      duration: data.duration,
      invitationScope: data.invitationScope,
      targetSchool: data.targetSchool,
      targetTeacherId: data.targetTeacherId,
      invitationMessage: data.invitationMessage
    }
  });

  const recipientWhere = (() => {
    if (data.invitationScope === 'TEACHERS') {
      return { role: { in: ['TEACHER', 'ADMIN'] }, emailVerified: true };
    }
    if (data.invitationScope === 'TEACHER') {
      return { id: data.targetTeacherId, role: 'TEACHER', emailVerified: true };
    }
    if (data.invitationScope === 'SCHOOL') {
      return {
        emailVerified: true,
        OR: [
          { role: 'TEACHER', school: data.targetSchool },
          { role: 'ADMIN' },
          { role: 'STUDENT', school: data.targetSchool, studentProfile: { is: { level: data.level } } }
        ]
      };
    }
    return {
      emailVerified: true,
      OR: [
        { role: 'TEACHER' },
        { role: 'ADMIN' },
        { role: 'STUDENT', studentProfile: { is: { level: data.level } } }
      ]
    };
  })();

  const recipients = await prisma.student.findMany({
    where: recipientWhere,
    select: { id: true }
  });

  if (recipients.length) {
    await prisma.userNotification.createMany({
      data: recipients.map((user) => ({
        userId: user.id,
        type: 'REMEDIAL_SESSION_NEW',
        title: data.isFree ? 'Nouvelle session gratuite' : 'Nouvelle session payante',
        message: data.invitationMessage || `${data.subject} · ${data.title}`,
        entityType: 'CATCHUP_SESSION',
        entityId: String(created.id)
      }))
    });
    emitRefresh(recipients.map((user) => user.id), ['notifications']);
  }

  return { ok: true, createdId: created.id, notifiedCount: recipients.length };
}

async function updateSession({ actor, sessionId, payload }) {
  const existing = await prisma.remedialSession.findUnique({
    where: { id: sessionId },
    select: { id: true, teacherId: true, status: true }
  });
  if (!existing) return { ok: false, status: 404, message: 'Session introuvable.' };

  const isOwnerTeacher = actor.role === 'TEACHER' && existing.teacherId === actor.id;
  const isAdmin = actor.role === 'ADMIN';
  if (!isOwnerTeacher && !isAdmin) {
    return { ok: false, status: 403, message: 'Action non autorisée.' };
  }

  const data = normalizeSessionPayload(payload);
  const updateData = {};
  if (payload.title !== undefined) updateData.title = data.title;
  if (payload.description !== undefined) updateData.description = data.description;
  if (payload.level !== undefined) updateData.level = data.level;
  if (payload.subject !== undefined) updateData.subject = data.subject;
  if (payload.isFree !== undefined || payload.price !== undefined) {
    updateData.isFree = data.isFree;
    updateData.price = decimal(data.isFree ? 0 : data.price || 0);
  }
  if (payload.maxParticipants !== undefined) updateData.maxParticipants = data.maxParticipants;
  if (payload.meetingLink !== undefined || payload.meetUrl !== undefined) updateData.meetingLink = data.meetingLink;
  if (payload.startTime !== undefined || payload.startsAt !== undefined) updateData.startTime = new Date(data.startTime);
  if (payload.duration !== undefined || payload.endsAt !== undefined) updateData.duration = data.duration;
  if (payload.status !== undefined) updateData.status = payload.status;
  if (payload.invitationScope !== undefined) updateData.invitationScope = data.invitationScope;
  if (payload.targetSchool !== undefined) updateData.targetSchool = data.targetSchool;
  if (payload.targetTeacherId !== undefined) updateData.targetTeacherId = data.targetTeacherId;
  if (payload.invitationMessage !== undefined) updateData.invitationMessage = data.invitationMessage;

  await prisma.remedialSession.update({
    where: { id: sessionId },
    data: updateData
  });

  return { ok: true };
}

async function deleteSession({ actor, sessionId }) {
  const existing = await prisma.remedialSession.findUnique({
    where: { id: sessionId },
    select: { id: true, teacherId: true }
  });
  if (!existing) return { ok: false, status: 404, message: 'Session introuvable.' };

  const isOwnerTeacher = actor.role === 'TEACHER' && existing.teacherId === actor.id;
  const isAdmin = actor.role === 'ADMIN';
  if (!isOwnerTeacher && !isAdmin) {
    return { ok: false, status: 403, message: 'Action non autorisée.' };
  }

  await prisma.remedialSession.delete({ where: { id: sessionId } });
  await prisma.userNotification.deleteMany({
    where: { entityType: 'CATCHUP_SESSION', entityId: String(sessionId) }
  });
  return { ok: true };
}

async function enrollStudent({ student, sessionId }) {
  if (student.role !== 'STUDENT') {
    return { ok: false, status: 403, message: 'Inscription réservée aux élèves.' };
  }

  await syncSessionStatuses();
  const fullStudent = await prisma.student.findUnique({
    where: { id: student.id },
    include: { studentProfile: true }
  });
  if (!fullStudent) return { ok: false, status: 404, message: 'Utilisateur introuvable.' };

  const session = await prisma.remedialSession.findUnique({
    where: { id: sessionId },
    include: { _count: { select: { enrollments: true } } }
  });
  if (!session || session.status !== 'SCHEDULED' || isSessionExpired(session)) {
    return { ok: false, status: 404, message: 'Session indisponible.' };
  }

  const studentLevel = getAcademicLevel(fullStudent);
  if (!studentLevel || session.level !== studentLevel) {
    return { ok: false, status: 403, message: 'Session non accessible pour ton niveau.' };
  }
  if (session.invitationScope === 'TEACHERS' || session.invitationScope === 'TEACHER') {
    return { ok: false, status: 403, message: 'Session réservée aux professeurs.' };
  }
  if (session.invitationScope === 'SCHOOL' && session.targetSchool && fullStudent.school !== session.targetSchool) {
    return { ok: false, status: 403, message: 'Session réservée à une autre école.' };
  }
  if (session._count.enrollments >= session.maxParticipants) {
    return { ok: false, status: 409, message: 'Session complète.' };
  }

  const existing = await prisma.remedialEnrollment.findUnique({
    where: { sessionId_studentId: { sessionId, studentId: student.id } }
  });
  if (existing) {
    return {
      ok: true,
      enrollment: existing,
      requiresPayment: existing.paymentStatus !== 'PAID',
      message: existing.paymentStatus === 'PAID' ? 'Déjà inscrit.' : 'Paiement en attente.'
    };
  }

  const paymentStatus = session.isFree ? 'PAID' : 'PENDING';
  const accessGranted = session.isFree;
  const enrollment = await prisma.remedialEnrollment.create({
    data: {
      sessionId,
      studentId: student.id,
      paymentStatus,
      accessGranted
    }
  });

  return {
    ok: true,
    enrollment,
    requiresPayment: !session.isFree,
    message: session.isFree ? 'Inscription validée.' : 'Inscription créée. Paiement requis.'
  };
}

async function payForSession({ student, sessionId, paymentMethod, amount }) {
  if (student.role !== 'STUDENT') {
    return { ok: false, status: 403, message: 'Paiement réservé aux élèves.' };
  }

  const session = await prisma.remedialSession.findUnique({
    where: { id: sessionId }
  });
  if (!session || session.status !== 'SCHEDULED') {
    return { ok: false, status: 404, message: 'Session indisponible.' };
  }
  if (session.isFree) {
    return { ok: false, status: 400, message: 'Session gratuite: aucun paiement requis.' };
  }

  const enrollment = await prisma.remedialEnrollment.findUnique({
    where: { sessionId_studentId: { sessionId, studentId: student.id } }
  });
  if (!enrollment) {
    return { ok: false, status: 404, message: 'Inscription introuvable. Réserve d’abord ta place.' };
  }
  if (enrollment.paymentStatus === 'PAID') {
    return { ok: true, message: 'Paiement déjà validé.' };
  }

  const amountDec = decimal(amount ?? session.price);
  const priceDec = decimal(session.price);
  if (amountDec.lessThan(priceDec)) {
    return { ok: false, status: 400, message: 'Montant insuffisant.' };
  }

  const commission = priceDec.mul(decimal(COMMISSION_RATE)).toDecimalPlaces(2);
  const teacherAmount = priceDec.sub(commission).toDecimalPlaces(2);

  await prisma.$transaction(async (tx) => {
    await tx.remedialTransaction.create({
      data: {
        userId: student.id,
        sessionId,
        amount: priceDec,
        platformCommission: commission,
        teacherAmount,
        status: 'success',
        paymentMethod
      }
    });
    await tx.remedialEnrollment.update({
      where: { sessionId_studentId: { sessionId, studentId: student.id } },
      data: { paymentStatus: 'PAID', accessGranted: true }
    });
  });

  return { ok: true, message: 'Paiement validé. Accès accordé.' };
}

async function teacherDashboard(teacherId) {
  const teacher = await prisma.student.findUnique({ where: { id: teacherId }, select: { id: true, role: true } });
  if (!teacher || !['TEACHER', 'ADMIN'].includes(teacher.role)) {
    return { ok: false, status: 403, message: 'Accès refusé.' };
  }

  const sessions = await prisma.remedialSession.findMany({
    where: teacher.role === 'TEACHER' ? { teacherId } : {},
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { enrollments: true } },
      transactions: {
        where: { status: 'success' },
        select: { amount: true, teacherAmount: true, platformCommission: true, createdAt: true }
      }
    }
  });

  const totalRevenue = sessions.reduce((sum, s) => {
    const value = s.transactions.reduce((acc, t) => acc + Number(t.teacherAmount || 0), 0);
    return sum + value;
  }, 0);

  const totalCommission = sessions.reduce((sum, s) => {
    const value = s.transactions.reduce((acc, t) => acc + Number(t.platformCommission || 0), 0);
    return sum + value;
  }, 0);

  const totalStudents = sessions.reduce((sum, s) => sum + Number(s._count.enrollments || 0), 0);

  const statsByLevelMap = new Map();
  sessions.forEach((s) => {
    const current = statsByLevelMap.get(s.level) || { level: s.level, sessions: 0, enrollments: 0 };
    current.sessions += 1;
    current.enrollments += Number(s._count.enrollments || 0);
    statsByLevelMap.set(s.level, current);
  });

  return {
    ok: true,
    data: {
      summary: {
        totalRevenue,
        totalCommission,
        totalStudents,
        totalSessions: sessions.length,
        commissionRate: COMMISSION_RATE
      },
      revenuesBySession: sessions.map((s) => ({
        sessionId: s.id,
        title: s.title,
        subject: s.subject,
        level: s.level,
        revenue: s.transactions.reduce((acc, t) => acc + Number(t.teacherAmount || 0), 0),
        commission: s.transactions.reduce((acc, t) => acc + Number(t.platformCommission || 0), 0),
        enrollments: Number(s._count.enrollments || 0)
      })),
      history: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        subject: s.subject,
        level: s.level,
        startTime: s.startTime,
        duration: s.duration,
        status: s.status,
        enrollments: Number(s._count.enrollments || 0)
      })),
      statsByLevel: Array.from(statsByLevelMap.values())
    }
  };
}

async function studentDashboard(studentId, { page = 1, pageSize = 10, level, subject }) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { studentProfile: true }
  });
  if (!student || student.role !== 'STUDENT') {
    return { ok: false, status: 403, message: 'Accès refusé.' };
  }

  const available = await listSessions({ viewer: student, page, pageSize, level, subject });

  const historyRows = await prisma.remedialEnrollment.findMany({
    where: { studentId },
    orderBy: { createdAt: 'desc' },
    include: {
      session: {
        select: {
          id: true,
          title: true,
          subject: true,
          level: true,
          startTime: true,
          duration: true,
          status: true,
          isFree: true,
          price: true
        }
      }
    }
  });

  const sessionIds = historyRows.map((row) => row.sessionId);
  const txRows = await prisma.remedialTransaction.findMany({
    where: { userId: studentId, sessionId: { in: sessionIds } },
    orderBy: { createdAt: 'desc' }
  });
  const txBySession = new Map();
  txRows.forEach((tx) => {
    if (!txBySession.has(tx.sessionId)) txBySession.set(tx.sessionId, tx);
  });

  return {
    ok: true,
    data: {
      available,
      history: historyRows.map((row) => ({
        enrollmentId: row.id,
        sessionId: row.sessionId,
        paymentStatus: row.paymentStatus,
        accessGranted: row.accessGranted,
        enrolledAt: row.createdAt,
        session: {
          ...row.session,
          price: Number(row.session.price || 0)
        },
        transaction: txBySession.get(row.sessionId)
          ? {
            amount: Number(txBySession.get(row.sessionId).amount || 0),
            paymentMethod: txBySession.get(row.sessionId).paymentMethod,
            status: txBySession.get(row.sessionId).status,
            createdAt: txBySession.get(row.sessionId).createdAt
          }
          : null
      }))
    }
  };
}

module.exports = {
  COMMISSION_RATE,
  listSessions,
  createSession,
  updateSession,
  deleteSession,
  enrollStudent,
  payForSession,
  teacherDashboard,
  studentDashboard
};
