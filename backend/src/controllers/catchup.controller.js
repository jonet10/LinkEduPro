const prisma = require('../config/prisma');
const { Prisma } = require('@prisma/client');

function isNsivFromStudent(student) {
  if (!student) return false;
  if (student.studentProfile?.level === 'NSIV') return true;
  return student.level === 'TERMINALE';
}

async function ensureViewerAccess(user) {
  if (!user) return { ok: false, status: 401, message: 'Authentification requise.' };
  if (user.role === 'ADMIN' || user.role === 'TEACHER') return { ok: true };

  const student = await prisma.student.findUnique({
    where: { id: user.id },
    include: { studentProfile: true }
  });
  if (!student) return { ok: false, status: 404, message: 'Utilisateur introuvable.' };
  if (!isNsivFromStudent(student)) {
    return { ok: false, status: 403, message: 'Rattrapage réservé aux élèves NSIV.' };
  }
  return { ok: true };
}

function mapSession(row) {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    description: row.description,
    meetUrl: row.meetUrl,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    level: 'NSIV',
    invitationScope: row.invitationScope || 'GLOBAL',
    targetSchool: row.targetSchool || null,
    targetTeacherId: row.targetTeacherId || null,
    targetTeacherName: row.targetTeacherName || null,
    invitationMessage: row.invitationMessage || null,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    createdBy: {
      id: row.createdById,
      firstName: row.createdByFirstName,
      lastName: row.createdByLastName
    }
  };
}

function buildInvitationMessage({
  customMessage,
  teacherName,
  title,
  subject,
  startsAt,
  meetUrl,
  invitationScope,
  targetSchool,
  targetTeacherName
}) {
  if (customMessage) return customMessage;
  const startLabel = new Date(startsAt).toLocaleString();

  if (invitationScope === 'TEACHERS') {
    return `${teacherName} a planifié un rattrapage entre professeurs (${subject}) : "${title}" le ${startLabel}. Lien Meet: ${meetUrl}`;
  }
  if (invitationScope === 'TEACHER' && targetTeacherName) {
    return `${teacherName} invite ${targetTeacherName} à une session de rattrapage (${subject}) : "${title}" le ${startLabel}. Lien Meet: ${meetUrl}`;
  }
  if (invitationScope === 'SCHOOL' && targetSchool) {
    return `${teacherName} organise une session de rattrapage NSIV pour l'école "${targetSchool}" (${subject}) : "${title}" le ${startLabel}. Lien Meet: ${meetUrl}`;
  }
  return `${teacherName} vous invite à une session de rattrapage NSIV (${subject}) : "${title}" le ${startLabel}. Lien Meet: ${meetUrl}`;
}

function buildRecipientsWhere({ invitationScope, targetSchool, targetTeacherId }) {
  if (invitationScope === 'TEACHERS') {
    return {
      emailVerified: true,
      OR: [{ role: 'TEACHER' }, { role: 'ADMIN' }]
    };
  }

  if (invitationScope === 'TEACHER') {
    return {
      id: Number(targetTeacherId),
      role: 'TEACHER',
      emailVerified: true
    };
  }

  if (invitationScope === 'SCHOOL') {
    return {
      emailVerified: true,
      OR: [
        {
          role: 'STUDENT',
          school: targetSchool,
          studentProfile: { is: { level: 'NSIV' } }
        },
        { role: 'TEACHER', school: targetSchool },
        { role: 'ADMIN' }
      ]
    };
  }

  return {
    emailVerified: true,
    OR: [
      {
        role: 'STUDENT',
        studentProfile: { is: { level: 'NSIV' } }
      },
      { role: 'TEACHER' },
      { role: 'ADMIN' }
    ]
  };
}

async function listRecipientUsers({ invitationScope, targetSchool, targetTeacherId }) {
  return prisma.student.findMany({
    where: buildRecipientsWhere({ invitationScope, targetSchool, targetTeacherId }),
    select: { id: true }
  });
}

async function listCatchupSessions(req, res, next) {
  try {
    const access = await ensureViewerAccess(req.user);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    const viewer = await prisma.student.findUnique({
      where: { id: req.user.id },
      select: { id: true, role: true, school: true }
    });

    let visibilityFilter = Prisma.sql`AND c.is_active = TRUE`;
    if (viewer?.role === 'STUDENT') {
      visibilityFilter = Prisma.sql`
        AND c.is_active = TRUE
        AND (
          c.invitation_scope = 'GLOBAL'
          OR (c.invitation_scope = 'SCHOOL' AND c.target_school = ${viewer.school})
        )
      `;
    } else if (viewer?.role === 'TEACHER') {
      visibilityFilter = Prisma.sql`
        AND c.is_active = TRUE
        AND (
          c.invitation_scope IN ('GLOBAL', 'TEACHERS')
          OR (c.invitation_scope = 'TEACHER' AND c.target_teacher = ${viewer.id})
          OR (c.invitation_scope = 'SCHOOL' AND c.target_school = ${viewer.school})
          OR c.created_by = ${viewer.id}
        )
      `;
    }

    const rows = await prisma.$queryRaw(
      Prisma.sql`
        SELECT
          c.id,
          c.title,
          c.subject,
          c.description,
          c.meet_url AS "meetUrl",
          c.starts_at AS "startsAt",
          c.ends_at AS "endsAt",
          c.invitation_scope AS "invitationScope",
          c.target_school AS "targetSchool",
          c.target_teacher AS "targetTeacherId",
          c.invitation_message AS "invitationMessage",
          c.is_active AS "isActive",
          c.created_at AS "createdAt",
          c.updated_at AS "updatedAt",
          s.id AS "createdById",
          s."firstName" AS "createdByFirstName",
          s."lastName" AS "createdByLastName",
          t."firstName" AS "targetTeacherFirstName",
          t."lastName" AS "targetTeacherLastName"
        FROM nsiv_catchup_sessions c
        INNER JOIN "Student" s ON s.id = c.created_by
        LEFT JOIN "Student" t ON t.id = c.target_teacher
        WHERE c.level = CAST('NSIV' AS "AcademicLevel")
        ${visibilityFilter}
        ORDER BY c.starts_at ASC
      `
    );

    const mapped = rows.map((row) => ({
      ...row,
      targetTeacherName: row.targetTeacherId
        ? `${row.targetTeacherFirstName || ''} ${row.targetTeacherLastName || ''}`.trim()
        : null
    }));
    return res.json({ sessions: mapped.map(mapSession) });
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
      select: { id: true, firstName: true, lastName: true, school: true, role: true }
    });
    if (!actor) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    const startsAt = new Date(req.body.startsAt);
    const endsAt = new Date(req.body.endsAt);
    if (!(startsAt instanceof Date) || Number.isNaN(startsAt.getTime())) {
      return res.status(400).json({ message: 'Date de début invalide.' });
    }
    if (!(endsAt instanceof Date) || Number.isNaN(endsAt.getTime())) {
      return res.status(400).json({ message: 'Date de fin invalide.' });
    }
    if (endsAt <= startsAt) {
      return res.status(400).json({ message: 'La fin doit être après le début.' });
    }

    const invitationScope = req.body.invitationScope || 'GLOBAL';
    const resolvedTargetSchool = invitationScope === 'SCHOOL'
      ? (req.body.targetSchool ? req.body.targetSchool.trim() : (actor.school || '').trim())
      : null;
    const resolvedTargetTeacherId = invitationScope === 'TEACHER'
      ? Number(req.body.targetTeacherId || 0)
      : null;

    if (invitationScope === 'SCHOOL' && !resolvedTargetSchool) {
      return res.status(400).json({ message: 'École cible requise pour une invitation par école.' });
    }

    let targetTeacher = null;
    if (invitationScope === 'TEACHER') {
      if (!resolvedTargetTeacherId) {
        return res.status(400).json({ message: 'Professeur cible requis.' });
      }
      targetTeacher = await prisma.student.findFirst({
        where: { id: resolvedTargetTeacherId, role: 'TEACHER' },
        select: { id: true, firstName: true, lastName: true }
      });
      if (!targetTeacher) {
        return res.status(404).json({ message: 'Professeur cible introuvable.' });
      }
    }

    const invitationMessage = buildInvitationMessage({
      customMessage: req.body.invitationMessage ? req.body.invitationMessage.trim() : '',
      teacherName: `${actor.firstName} ${actor.lastName}`.trim(),
      title: req.body.title.trim(),
      subject: req.body.subject.trim(),
      startsAt,
      meetUrl: req.body.meetUrl.trim(),
      invitationScope,
      targetSchool: resolvedTargetSchool,
      targetTeacherName: targetTeacher ? `${targetTeacher.firstName} ${targetTeacher.lastName}`.trim() : null
    });

    const rows = await prisma.$queryRaw(
      Prisma.sql`
        INSERT INTO nsiv_catchup_sessions
          (title, subject, description, meet_url, starts_at, ends_at, level, invitation_scope, target_school, target_teacher, invitation_message, is_active, created_by)
        VALUES
          (${req.body.title.trim()},
           ${req.body.subject.trim()},
           ${req.body.description ? req.body.description.trim() : null},
           ${req.body.meetUrl.trim()},
           ${startsAt},
           ${endsAt},
           CAST('NSIV' AS "AcademicLevel"),
           ${invitationScope},
           ${resolvedTargetSchool},
           ${resolvedTargetTeacherId},
           ${invitationMessage},
           TRUE,
           ${req.user.id})
        RETURNING id
      `
    );

    const createdId = rows[0]?.id || null;
    const recipients = await listRecipientUsers({
      invitationScope,
      targetSchool: resolvedTargetSchool,
      targetTeacherId: resolvedTargetTeacherId
    });

    if (recipients.length) {
      await prisma.userNotification.createMany({
        data: recipients.map((user) => ({
          userId: user.id,
          type: 'CATCHUP_INVITE',
          title: 'Nouvelle session de rattrapage NSIV',
          message: invitationMessage,
          entityType: 'CATCHUP_SESSION',
          entityId: String(createdId)
        }))
      });
    }

    return res.status(201).json({
      message: 'Session de rattrapage planifiée.',
      id: createdId,
      notifiedCount: recipients.length
    });
  } catch (error) {
    return next(error);
  }
}

async function updateCatchupSession(req, res, next) {
  try {
    const sessionId = Number(req.params.id);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return res.status(400).json({ message: 'Session invalide.' });
    }

    const existingRows = await prisma.$queryRaw(
      Prisma.sql`SELECT id, created_by AS "createdBy" FROM nsiv_catchup_sessions WHERE id = ${sessionId} LIMIT 1`
    );
    if (!existingRows.length) {
      return res.status(404).json({ message: 'Session introuvable.' });
    }

    const existing = existingRows[0];
    const isAdmin = req.user.role === 'ADMIN';
    const isOwnerTeacher = req.user.role === 'TEACHER' && Number(existing.createdBy) === req.user.id;
    if (!isAdmin && !isOwnerTeacher) {
      return res.status(403).json({ message: 'Action non autorisée.' });
    }

    if (req.body.invitationScope === 'TEACHER' && !req.body.targetTeacherId) {
      return res.status(400).json({ message: 'Professeur cible requis pour ce scope.' });
    }
    if (req.body.invitationScope === 'SCHOOL' && !req.body.targetSchool) {
      return res.status(400).json({ message: 'École cible requise pour ce scope.' });
    }

    const fields = [];
    if (req.body.title !== undefined) fields.push(Prisma.sql`title = ${req.body.title.trim()}`);
    if (req.body.subject !== undefined) fields.push(Prisma.sql`subject = ${req.body.subject.trim()}`);
    if (req.body.description !== undefined) {
      fields.push(Prisma.sql`description = ${req.body.description ? req.body.description.trim() : null}`);
    }
    if (req.body.meetUrl !== undefined) fields.push(Prisma.sql`meet_url = ${req.body.meetUrl.trim()}`);
    if (req.body.startsAt !== undefined) fields.push(Prisma.sql`starts_at = ${new Date(req.body.startsAt)}`);
    if (req.body.endsAt !== undefined) fields.push(Prisma.sql`ends_at = ${new Date(req.body.endsAt)}`);
    if (req.body.invitationScope !== undefined) fields.push(Prisma.sql`invitation_scope = ${req.body.invitationScope}`);
    if (req.body.targetSchool !== undefined) fields.push(Prisma.sql`target_school = ${req.body.targetSchool ? req.body.targetSchool.trim() : null}`);
    if (req.body.targetTeacherId !== undefined) {
      fields.push(Prisma.sql`target_teacher = ${req.body.targetTeacherId ? Number(req.body.targetTeacherId) : null}`);
    }
    if (req.body.invitationMessage !== undefined) {
      fields.push(Prisma.sql`invitation_message = ${req.body.invitationMessage ? req.body.invitationMessage.trim() : null}`);
    }
    if (req.body.isActive !== undefined) fields.push(Prisma.sql`is_active = ${Boolean(req.body.isActive)}`);
    fields.push(Prisma.sql`updated_at = CURRENT_TIMESTAMP`);

    await prisma.$executeRaw(
      Prisma.sql`UPDATE nsiv_catchup_sessions SET ${Prisma.join(fields, Prisma.sql`, `)} WHERE id = ${sessionId}`
    );

    return res.json({ message: 'Session mise à jour.' });
  } catch (error) {
    return next(error);
  }
}

async function deleteCatchupSession(req, res, next) {
  try {
    const sessionId = Number(req.params.id);
    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return res.status(400).json({ message: 'Session invalide.' });
    }

    const existingRows = await prisma.$queryRaw(
      Prisma.sql`SELECT id, created_by AS "createdBy" FROM nsiv_catchup_sessions WHERE id = ${sessionId} LIMIT 1`
    );
    if (!existingRows.length) {
      return res.status(404).json({ message: 'Session introuvable.' });
    }

    const existing = existingRows[0];
    const isAdmin = req.user.role === 'ADMIN';
    const isOwnerTeacher = req.user.role === 'TEACHER' && Number(existing.createdBy) === req.user.id;
    if (!isAdmin && !isOwnerTeacher) {
      return res.status(403).json({ message: 'Action non autorisée.' });
    }

    await prisma.$executeRaw(
      Prisma.sql`DELETE FROM nsiv_catchup_sessions WHERE id = ${sessionId}`
    );
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listCatchupSessions,
  listTargetTeachers,
  createCatchupSession,
  updateCatchupSession,
  deleteCatchupSession
};
