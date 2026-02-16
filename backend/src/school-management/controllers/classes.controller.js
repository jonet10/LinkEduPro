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

module.exports = { createClass, listClasses };
