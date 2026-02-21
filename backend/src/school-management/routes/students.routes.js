const express = require('express');
const validate = require('../../middlewares/validate');
const requireSchoolRoles = require('../middlewares/school-rbac');
const enforceSchoolScope = require('../middlewares/school-scope');
const { uploadStudentImport } = require('../middlewares/upload');
const { updateStudentSchema } = require('../validators/school.validators');
const { listStudents, listGlobalStudents, importStudents, importHistory, updateStudent, deactivateStudent } = require('../controllers/students.controller');

const router = express.Router();

router.get('/global', requireSchoolRoles(['SUPER_ADMIN']), listGlobalStudents);
router.get('/schools/:schoolId', enforceSchoolScope((req) => req.params.schoolId), listStudents);
router.get('/schools/:schoolId/import-history', enforceSchoolScope((req) => req.params.schoolId), importHistory);

router.post(
  '/schools/:schoolId/import',
  requireSchoolRoles(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  enforceSchoolScope((req) => req.params.schoolId),
  uploadStudentImport.single('file'),
  importStudents
);

router.put(
  '/schools/:schoolId/:studentId',
  requireSchoolRoles(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  enforceSchoolScope((req) => req.params.schoolId),
  validate(updateStudentSchema),
  updateStudent
);

router.delete(
  '/schools/:schoolId/:studentId',
  requireSchoolRoles(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  enforceSchoolScope((req) => req.params.schoolId),
  deactivateStudent
);

module.exports = router;
