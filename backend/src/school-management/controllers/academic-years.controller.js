const prisma = require('../../config/prisma');
const { createSchoolLog } = require('../services/school-log.service');

async function createAcademicYear(req, res, next) {
  try {
    const schoolId = Number(req.params.schoolId);
    const user = req.schoolUser;
    const { label, startDate, endDate, isActive } = req.body;

    const year = await prisma.$transaction(async (tx) => {
      if (isActive) {
        await tx.schoolAcademicYear.updateMany({ where: { schoolId }, data: { isActive: false } });
      }
      return tx.schoolAcademicYear.create({
        data: {
          schoolId,
          label,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          isActive: Boolean(isActive)
        }
      });
    });

    await createSchoolLog({
      schoolId,
      actorId: user.id,
      actorRole: user.role,
      action: 'ACADEMIC_YEAR_CREATED',
      entityType: 'SchoolAcademicYear',
      entityId: String(year.id)
    });

    return res.status(201).json({ academicYear: year });
  } catch (error) {
    return next(error);
  }
}

async function listAcademicYears(req, res, next) {
  try {
    const schoolId = Number(req.params.schoolId);
    const years = await prisma.schoolAcademicYear.findMany({
      where: { schoolId },
      orderBy: { startDate: 'desc' }
    });
    return res.json({ academicYears: years });
  } catch (error) {
    return next(error);
  }
}

module.exports = { createAcademicYear, listAcademicYears };
