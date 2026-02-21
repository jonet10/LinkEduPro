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

async function updateStudent(req, res, next) {
  try {
    const schoolId = Number(req.params.schoolId);
    const studentPk = Number(req.params.studentId);
    const user = req.schoolUser;
    const { classId, academicYearId, studentId, firstName, lastName, sex } = req.body;

    const existing = await prisma.schoolStudent.findFirst({
      where: { id: studentPk, schoolId, isActive: true }
    });
    if (!existing) {
      return res.status(404).json({ message: 'Eleve introuvable.' });
    }

    const [schoolClass, year] = await Promise.all([
      prisma.schoolClass.findFirst({ where: { id: Number(classId), schoolId } }),
      prisma.schoolAcademicYear.findFirst({ where: { id: Number(academicYearId), schoolId } })
    ]);

    if (!schoolClass || !year) {
      return res.status(400).json({ message: 'Classe ou annee academique invalide pour cette ecole.' });
    }

    const duplicate = await prisma.schoolStudent.findFirst({
      where: {
        schoolId,
        studentId,
        id: { not: studentPk }
      },
      select: { id: true }
    });

    if (duplicate) {
      return res.status(400).json({ message: 'Matricule deja utilise dans cette ecole.' });
    }

    const updated = await prisma.schoolStudent.update({
      where: { id: studentPk },
      data: {
        classId: Number(classId),
        academicYearId: Number(academicYearId),
        studentId,
        firstName,
        lastName,
        sex
      },
      include: {
        schoolClass: { select: { id: true, name: true } },
        academicYear: { select: { id: true, label: true } }
      }
    });

    await createSchoolLog({
      schoolId,
      actorId: user.id,
      actorRole: user.role,
      action: 'STUDENT_UPDATED',
      entityType: 'SchoolStudent',
      entityId: String(studentPk),
      metadata: { studentId }
    });

    return res.json({ student: updated });
  } catch (error) {
    return next(error);
  }
}

async function deactivateStudent(req, res, next) {
  try {
    const schoolId = Number(req.params.schoolId);
    const studentPk = Number(req.params.studentId);
    const user = req.schoolUser;

    const existing = await prisma.schoolStudent.findFirst({
      where: { id: studentPk, schoolId, isActive: true }
    });
    if (!existing) {
      return res.status(404).json({ message: 'Eleve introuvable.' });
    }

    await prisma.schoolStudent.update({
      where: { id: studentPk },
      data: { isActive: false }
    });

    await createSchoolLog({
      schoolId,
      actorId: user.id,
      actorRole: user.role,
      action: 'STUDENT_DEACTIVATED',
      entityType: 'SchoolStudent',
      entityId: String(studentPk)
    });

    return res.json({ message: 'Eleve desactive.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listStudents, importStudents, importHistory, updateStudent, deactivateStudent };
