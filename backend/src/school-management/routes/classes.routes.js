const express = require('express');
const validate = require('../../middlewares/validate');
const requireSchoolRoles = require('../middlewares/school-rbac');
const enforceSchoolScope = require('../middlewares/school-scope');
const { createClass, listClasses, updateClass, deleteClass } = require('../controllers/classes.controller');
const { createClassSchema, updateClassSchema } = require('../validators/school.validators');

const router = express.Router();

router.post(
  '/',
  requireSchoolRoles(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  enforceSchoolScope((req) => req.body.schoolId),
  validate(createClassSchema),
  createClass
);

router.get(
  '/schools/:schoolId',
  enforceSchoolScope((req) => req.params.schoolId),
  listClasses
);

router.put(
  '/schools/:schoolId/:classId',
  requireSchoolRoles(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  enforceSchoolScope((req) => req.params.schoolId),
  validate(updateClassSchema),
  updateClass
);

router.delete(
  '/schools/:schoolId/:classId',
  requireSchoolRoles(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  enforceSchoolScope((req) => req.params.schoolId),
  deleteClass
);

module.exports = router;
