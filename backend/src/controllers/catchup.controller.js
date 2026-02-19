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
    return { ok: false, status: 403, message: 'Rattrapage reserve aux eleves NSIV.' };
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

async function listCatchupSessions(req, res, next) {
  try {
    const access = await ensureViewerAccess(req.user);
    if (!access.ok) return res.status(access.status).json({ message: access.message });

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
          c.is_active AS "isActive",
          c.created_at AS "createdAt",
          c.updated_at AS "updatedAt",
          s.id AS "createdById",
          s."firstName" AS "createdByFirstName",
          s."lastName" AS "createdByLastName"
        FROM nsiv_catchup_sessions c
        INNER JOIN "Student" s ON s.id = c.created_by
        WHERE c.level = CAST('NSIV' AS "AcademicLevel")
          AND c.is_active = TRUE
        ORDER BY c.starts_at ASC
      `
    );

    return res.json({ sessions: rows.map(mapSession) });
  } catch (error) {
    return next(error);
  }
}

async function createCatchupSession(req, res, next) {
  try {
    const startsAt = new Date(req.body.startsAt);
    const endsAt = new Date(req.body.endsAt);
    if (!(startsAt instanceof Date) || Number.isNaN(startsAt.getTime())) {
      return res.status(400).json({ message: 'Date de debut invalide.' });
    }
    if (!(endsAt instanceof Date) || Number.isNaN(endsAt.getTime())) {
      return res.status(400).json({ message: 'Date de fin invalide.' });
    }
    if (endsAt <= startsAt) {
      return res.status(400).json({ message: 'La fin doit etre apres le debut.' });
    }

    const rows = await prisma.$queryRaw(
      Prisma.sql`
        INSERT INTO nsiv_catchup_sessions
          (title, subject, description, meet_url, starts_at, ends_at, level, is_active, created_by)
        VALUES
          (${req.body.title.trim()},
           ${req.body.subject.trim()},
           ${req.body.description ? req.body.description.trim() : null},
           ${req.body.meetUrl.trim()},
           ${startsAt},
           ${endsAt},
           CAST('NSIV' AS "AcademicLevel"),
           TRUE,
           ${req.user.id})
        RETURNING id
      `
    );

    return res.status(201).json({
      message: 'Session de rattrapage planifiee.',
      id: rows[0]?.id || null
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
      return res.status(403).json({ message: 'Action non autorisee.' });
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
    if (req.body.isActive !== undefined) fields.push(Prisma.sql`is_active = ${Boolean(req.body.isActive)}`);
    fields.push(Prisma.sql`updated_at = CURRENT_TIMESTAMP`);

    await prisma.$executeRaw(
      Prisma.sql`UPDATE nsiv_catchup_sessions SET ${Prisma.join(fields, Prisma.sql`, `)} WHERE id = ${sessionId}`
    );

    return res.json({ message: 'Session mise a jour.' });
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
      return res.status(403).json({ message: 'Action non autorisee.' });
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
  createCatchupSession,
  updateCatchupSession,
  deleteCatchupSession
};
