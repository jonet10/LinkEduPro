const express = require('express');
const validate = require('../../middlewares/validate');
const requireSchoolRoles = require('../middlewares/school-rbac');
const enforceSchoolScope = require('../middlewares/school-scope');
const { createSchool, listSchools } = require('../controllers/schools.controller');
const { createAcademicYear, listAcademicYears } = require('../controllers/academic-years.controller');
const { createSchoolSchema, createAcademicYearSchema } = require('../validators/school.validators');

const router = express.Router();

router.get('/', requireSchoolRoles(['SUPER_ADMIN']), listSchools);
router.post('/', requireSchoolRoles(['SUPER_ADMIN']), validate(createSchoolSchema), createSchool);

router.get('/:schoolId/academic-years', enforceSchoolScope((req) => req.params.schoolId), listAcademicYears);
router.post(
  '/:schoolId/academic-years',
  requireSchoolRoles(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  enforceSchoolScope((req) => req.params.schoolId),
  validate(createAcademicYearSchema),
  createAcademicYear
);

module.exports = router;
