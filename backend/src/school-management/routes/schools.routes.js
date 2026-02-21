const express = require('express');
const validate = require('../../middlewares/validate');
const requireSchoolRoles = require('../middlewares/school-rbac');
const enforceSchoolScope = require('../middlewares/school-scope');
const {
  createSchool,
  listSchools,
  updateSchool,
  setSchoolStatus,
  resetSchoolAdminPassword
} = require('../controllers/schools.controller');
const { createAcademicYear, listAcademicYears } = require('../controllers/academic-years.controller');
const {
  createSchoolSchema,
  updateSchoolSchema,
  setSchoolStatusSchema,
  createAcademicYearSchema
} = require('../validators/school.validators');

const router = express.Router();

router.get('/', requireSchoolRoles(['SUPER_ADMIN']), listSchools);
router.post('/', requireSchoolRoles(['SUPER_ADMIN']), validate(createSchoolSchema), createSchool);
router.put('/:schoolId', requireSchoolRoles(['SUPER_ADMIN']), validate(updateSchoolSchema), updateSchool);
router.patch('/:schoolId/status', requireSchoolRoles(['SUPER_ADMIN']), validate(setSchoolStatusSchema), setSchoolStatus);
router.post('/:schoolId/reset-admin-password', requireSchoolRoles(['SUPER_ADMIN']), resetSchoolAdminPassword);

router.get('/:schoolId/academic-years', enforceSchoolScope((req) => req.params.schoolId), listAcademicYears);
router.post(
  '/:schoolId/academic-years',
  requireSchoolRoles(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  enforceSchoolScope((req) => req.params.schoolId),
  validate(createAcademicYearSchema),
  createAcademicYear
);

module.exports = router;
