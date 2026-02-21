const prisma = require('../../config/prisma');
const { createSchoolLog } = require('../services/school-log.service');

async function createClass(req, res, next) {
  try {
    const user = req.schoolUser;
    const { schoolId, academicYearId, name, level, capacity } = req.body;
    const year = await prisma.schoolAcademicYear.findFirst({
      where: { id: Number(academicYearId), schoolId: Number(schoolId) }
    });

    if (!year) {
      return res.status(400).json({ message: 'Annee academique invalide pour cette ecole.' });
    }

    const schoolClass = await prisma.schoolClass.create({
      data: {
        schoolId: Number(schoolId),
        academicYearId: Number(academicYearId),
        name,
        level: level || null,
        capacity: capacity || null
      }
    });

    await createSchoolLog({
      schoolId: Number(schoolId),
      actorId: user.id,
      actorRole: user.role,
      action: 'CLASS_CREATED',
      entityType: 'SchoolClass',
      entityId: String(schoolClass.id)
    });

    return res.status(201).json({ schoolClass });
  } catch (error) {
    return next(error);
  }
}

async function listClasses(req, res, next) {
  try {
    const schoolId = Number(req.params.schoolId);
    const academicYearId = req.query.academicYearId ? Number(req.query.academicYearId) : undefined;

    const schoolClasses = await prisma.schoolClass.findMany({
      where: {
        schoolId,
        academicYearId
      },
      include: {
        _count: { select: { students: true } },
        academicYear: { select: { id: true, label: true } }
      },
      orderBy: { name: 'asc' }
    });

    return res.json({ classes: schoolClasses });
  } catch (error) {
    return next(error);
  }
}

async function updateClass(req, res, next) {
  try {
    const user = req.schoolUser;
    const schoolId = Number(req.params.schoolId);
    const classId = Number(req.params.classId);
    const { academicYearId, name, level, capacity } = req.body;

    const existing = await prisma.schoolClass.findFirst({
      where: { id: classId, schoolId }
    });
    if (!existing) {
      return res.status(404).json({ message: 'Classe introuvable.' });
    }

    const year = await prisma.schoolAcademicYear.findFirst({
      where: { id: Number(academicYearId), schoolId }
    });
    if (!year) {
      return res.status(400).json({ message: 'Annee academique invalide pour cette ecole.' });
    }

    const updated = await prisma.schoolClass.update({
      where: { id: classId },
      data: {
        academicYearId: Number(academicYearId),
        name,
        level: level || null,
        capacity: capacity || null
      },
      include: {
        _count: { select: { students: true } },
        academicYear: { select: { id: true, label: true } }
      }
    });

    await createSchoolLog({
      schoolId,
      actorId: user.id,
      actorRole: user.role,
      action: 'CLASS_UPDATED',
      entityType: 'SchoolClass',
      entityId: String(classId)
    });

    return res.json({ schoolClass: updated });
  } catch (error) {
    return next(error);
  }
}

async function deleteClass(req, res, next) {
  try {
    const user = req.schoolUser;
    const schoolId = Number(req.params.schoolId);
    const classId = Number(req.params.classId);

    const existing = await prisma.schoolClass.findFirst({
      where: { id: classId, schoolId },
      include: {
        _count: { select: { students: true, payments: true } }
      }
    });
    if (!existing) {
      return res.status(404).json({ message: 'Classe introuvable.' });
    }

    if ((existing._count?.students || 0) > 0 || (existing._count?.payments || 0) > 0) {
      return res.status(400).json({
        message: 'Impossible de supprimer une classe avec des eleves ou paiements lies.'
      });
    }

    await prisma.schoolClass.delete({ where: { id: classId } });

    await createSchoolLog({
      schoolId,
      actorId: user.id,
      actorRole: user.role,
      action: 'CLASS_DELETED',
      entityType: 'SchoolClass',
      entityId: String(classId)
    });

    return res.json({ message: 'Classe supprimee.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { createClass, listClasses, updateClass, deleteClass };
