const express = require('express');
const validate = require('../../middlewares/validate');
const { requireSuperAdmin } = require('../middlewares/roles');
const {
  getConfig,
  updateConfig,
  getSuperDashboard,
  listPlatformStudents,
  listPlatformUsers,
  moderatePlatformUser,
  deletePlatformUser
} = require('../controllers/admin.controller');
const { createTeacherInvitation, listTeacherInvitations } = require('../controllers/invitations.controller');
const { updateConfigSchema, createTeacherInvitationSchema } = require('../validators/community.validators');

const router = express.Router();

router.get('/config', requireSuperAdmin, getConfig);
router.put('/config', requireSuperAdmin, validate(updateConfigSchema), updateConfig);
router.get('/super-dashboard', requireSuperAdmin, getSuperDashboard);
router.get('/students-registry', requireSuperAdmin, listPlatformStudents);
router.get('/users-registry', requireSuperAdmin, listPlatformUsers);
router.patch('/users-registry/:userId/moderate', requireSuperAdmin, moderatePlatformUser);
router.delete('/users-registry/:userId', requireSuperAdmin, deletePlatformUser);
router.get('/teacher-invitations', requireSuperAdmin, listTeacherInvitations);
router.post('/teacher-invitations', requireSuperAdmin, validate(createTeacherInvitationSchema), createTeacherInvitation);

module.exports = router;
