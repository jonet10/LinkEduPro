const express = require('express');
const validate = require('../../middlewares/validate');
const requireSchoolRoles = require('../middlewares/school-rbac');
const enforceSchoolScope = require('../middlewares/school-scope');
const {
  createPaymentType,
  listPaymentTypes,
  createPayment,
  listPayments,
  deletePayment,
  downloadReceipt
} = require('../controllers/payments.controller');
const { createPaymentTypeSchema, createPaymentSchema } = require('../validators/school.validators');

const router = express.Router();

router.post(
  '/types',
  requireSchoolRoles(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  enforceSchoolScope((req) => req.body.schoolId),
  validate(createPaymentTypeSchema),
  createPaymentType
);

router.get('/types/schools/:schoolId', enforceSchoolScope((req) => req.params.schoolId), listPaymentTypes);

router.post(
  '/',
  requireSchoolRoles(['SUPER_ADMIN', 'SCHOOL_ADMIN', 'SCHOOL_ACCOUNTANT']),
  enforceSchoolScope((req) => req.body.schoolId),
  validate(createPaymentSchema),
  createPayment
);

router.get('/schools/:schoolId', enforceSchoolScope((req) => req.params.schoolId), listPayments);
router.delete(
  '/schools/:schoolId/:paymentId',
  requireSchoolRoles(['SUPER_ADMIN', 'SCHOOL_ADMIN']),
  enforceSchoolScope((req) => req.params.schoolId),
  deletePayment
);
router.get('/schools/:schoolId/:paymentId/receipt', enforceSchoolScope((req) => req.params.schoolId), downloadReceipt);

module.exports = router;
