const fs = require('fs');
const prisma = require('../../config/prisma');
const { importStudentsFromFile } = require('../services/student-import.service');
const { createSchoolLog } = require('../services/school-log.service');

async function listStudents(req, res, next) {
  try {
    const schoolId = Number(req.params.schoolId);
    const classId = req.query.classId ? Number(req.query.classId) : undefined;
    const academicYearId = req.query.academicYearId ? Number(req.query.academicYearId) : undefined;

    const students = await prisma.schoolStudent.findMany({
      where: {
        schoolId,
        classId,
        academicYearId,
        isActive: true
      },
      include: {
        schoolClass: { select: { id: true, name: true } },
        academicYear: { select: { id: true, label: true } }
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
    });

    return res.json({ students });
  } catch (error) {
    return next(error);
  }
}

async function importStudents(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Fichier requis.' });
    }

    const schoolId = Number(req.params.schoolId);
    const classId = Number(req.body.classId);
    const academicYearId = Number(req.body.academicYearId);

    const report = await importStudentsFromFile({
      schoolId,
      actor: req.schoolUser,
      filePath: req.file.path,
      classId,
      academicYearId
    });

    await createSchoolLog({
      schoolId,
      actorId: req.schoolUser.id,
      actorRole: req.schoolUser.role,
      action: 'STUDENTS_IMPORTED',
      entityType: 'SchoolStudent',
      metadata: {
        fileName: req.file.originalname,
        createdCount: report.createdCount,
        errors: report.errors
      }
    });

    await fs.promises.unlink(req.file.path).catch(() => null);

    return res.status(201).json({
      message: 'Import termine.',
      createdCount: report.createdCount,
      errors: report.errors
    });
  } catch (error) {
    return next(error);
  }
}

async function importHistory(req, res, next) {
  try {
    const schoolId = Number(req.params.schoolId);
    const logs = await prisma.schoolLog.findMany({
      where: {
        schoolId,
        action: 'STUDENTS_IMPORTED'
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return res.json({ imports: logs });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listStudents, importStudents, importHistory };
