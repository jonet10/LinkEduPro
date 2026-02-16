const XLSX = require('xlsx');
const prisma = require('../../config/prisma');
const { makeStudentId } = require('../utils/student-id');

function norm(value) {
  return String(value || '').trim();
}

async function importStudentsFromFile({ schoolId, actor, filePath, classId, academicYearId }) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const cls = await prisma.schoolClass.findFirst({ where: { id: Number(classId), schoolId: Number(schoolId) } });
  if (!cls) {
    throw new Error('Classe invalide pour cette ecole.');
  }

  const year = await prisma.schoolAcademicYear.findFirst({ where: { id: Number(academicYearId), schoolId: Number(schoolId) } });
  if (!year) {
    throw new Error('Annee academique invalide pour cette ecole.');
  }

  const errors = [];
  const toCreate = [];
  const fileSeen = new Set();

  for (let i = 0; i < rows.length; i += 1) {
    const rowIndex = i + 2;
    const row = rows[i];
    const firstName = norm(row.prenom || row.first_name || row.firstname);
    const lastName = norm(row.nom || row.last_name || row.lastname);
    const sex = norm(row.sexe || row.sex).toUpperCase();

    if (!firstName || !lastName || !['MALE', 'FEMALE', 'OTHER'].includes(sex)) {
      errors.push({ row: rowIndex, message: 'Colonnes invalides: nom, prenom, sexe requis.' });
      continue;
    }

    const duplicateKey = `${firstName.toLowerCase()}-${lastName.toLowerCase()}-${academicYearId}-${classId}`;
    if (fileSeen.has(duplicateKey)) {
      errors.push({ row: rowIndex, message: 'Doublon detecte dans le fichier.' });
      continue;
    }

    fileSeen.add(duplicateKey);
    toCreate.push({ firstName, lastName, sex, rowIndex });
  }

  if (!toCreate.length) {
    return { createdCount: 0, errors };
  }

  const existing = await prisma.schoolStudent.findMany({
    where: {
      schoolId: Number(schoolId),
      academicYearId: Number(academicYearId),
      classId: Number(classId),
      OR: toCreate.map((s) => ({ firstName: s.firstName, lastName: s.lastName }))
    },
    select: { firstName: true, lastName: true }
  });

  const existingSet = new Set(existing.map((s) => `${s.firstName.toLowerCase()}-${s.lastName.toLowerCase()}`));
  const createPayload = [];

  for (let i = 0; i < toCreate.length; i += 1) {
    const student = toCreate[i];
    const key = `${student.firstName.toLowerCase()}-${student.lastName.toLowerCase()}`;
    if (existingSet.has(key)) {
      errors.push({ row: student.rowIndex, message: 'Eleve deja present en base.' });
      continue;
    }

    createPayload.push({
      schoolId: Number(schoolId),
      classId: Number(classId),
      academicYearId: Number(academicYearId),
      studentId: makeStudentId({
        schoolId: Number(schoolId),
        academicYearLabel: year.label,
        firstName: student.firstName,
        lastName: student.lastName,
        index: Date.now() % 10000 + i
      }),
      firstName: student.firstName,
      lastName: student.lastName,
      sex: student.sex
    });
  }

  if (createPayload.length) {
    await prisma.$transaction(createPayload.map((payload) => prisma.schoolStudent.create({ data: payload })));
  }

  return {
    createdCount: createPayload.length,
    errors
  };
}

module.exports = { importStudentsFromFile };
