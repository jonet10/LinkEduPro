const express = require('express');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { requireRoles } = require('../middlewares/roles');
const {
  listCatchupSessions,
  createCatchupSession,
  updateCatchupSession,
  deleteCatchupSession
} = require('../controllers/catchup.controller');
const {
  catchupSessionCreateSchema,
  catchupSessionUpdateSchema
} = require('../services/validators');

const router = express.Router();

router.use(auth);

router.get('/', listCatchupSessions);
router.post('/', requireRoles(['ADMIN', 'TEACHER']), validate(catchupSessionCreateSchema), createCatchupSession);
router.patch('/:id', requireRoles(['ADMIN', 'TEACHER']), validate(catchupSessionUpdateSchema), updateCatchupSession);
router.delete('/:id', requireRoles(['ADMIN', 'TEACHER']), deleteCatchupSession);

module.exports = router;
