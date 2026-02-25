const express = require('express');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { requireRoles } = require('../middlewares/roles');
const {
  listCatchupSessions,
  listTargetTeachers,
  createCatchupSession,
  updateCatchupSession,
  deleteCatchupSession,
  enrollInCatchupSession,
  confirmCatchupPresence,
  payCatchupSession,
  getTeacherCatchupDashboard,
  getStudentCatchupDashboard
} = require('../controllers/catchup.controller');
const {
  catchupSessionCreateSchema,
  catchupSessionUpdateSchema,
  catchupPaymentSchema
} = require('../services/validators');

const router = express.Router();

router.use(auth);

router.get('/', listCatchupSessions);
router.get('/teachers', requireRoles(['ADMIN', 'TEACHER']), listTargetTeachers);
router.get('/dashboard/teacher', requireRoles(['ADMIN', 'TEACHER']), getTeacherCatchupDashboard);
router.get('/dashboard/student', requireRoles(['STUDENT']), getStudentCatchupDashboard);
router.post('/', requireRoles(['ADMIN', 'TEACHER']), validate(catchupSessionCreateSchema), createCatchupSession);
router.post('/:id/enroll', requireRoles(['STUDENT']), enrollInCatchupSession);
router.post('/:id/confirm-presence', requireRoles(['STUDENT']), confirmCatchupPresence);
router.post('/:id/pay', requireRoles(['STUDENT']), validate(catchupPaymentSchema), payCatchupSession);
router.patch('/:id', requireRoles(['ADMIN', 'TEACHER']), validate(catchupSessionUpdateSchema), updateCatchupSession);
router.delete('/:id', requireRoles(['ADMIN', 'TEACHER']), deleteCatchupSession);

module.exports = router;
