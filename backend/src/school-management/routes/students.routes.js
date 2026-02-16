const express = require('express');
const requireSchoolRoles = require('../middlewares/school-rbac');
const enforceSchoolScope = require('../middlewares/school-scope');
const { uploadStudentImport } = require('../middlewares/upload');
const { listStudents, importStudents, importHistory } = require('../controllers/students.controller');

const router = express.Router();

router.get('/schools/:schoolId', enforceSchoolScope((req) => req.params.schoolId), listStudents);
router.get('/schools/:schoolId/import-history', enforceSchoolScope((req) => req.params.schoolId), importHistory);

router.post(
  '/schools/:schoolId/import',
  requireSchoolRoles(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  enforceSchoolScope((req) => req.params.schoolId),
  uploadStudentImport.single('file'),
  importStudents
);

module.exports = router;
