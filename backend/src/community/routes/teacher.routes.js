const express = require('express');
const validate = require('../../middlewares/validate');
const { requireTeacherOrAdmin, requireSuperAdmin } = require('../middlewares/roles');
const { uploadTeacherDocument } = require('../middlewares/upload');
const {
  submitVerification,
  listMyVerifications,
  listPendingVerifications,
  reviewVerification,
  updateTeacherLevel
} = require('../controllers/teacher.controller');
const { reviewVerificationSchema, updateTeacherLevelSchema } = require('../validators/community.validators');

const router = express.Router();

router.get('/verifications/me', requireTeacherOrAdmin, listMyVerifications);
router.post('/verifications', requireTeacherOrAdmin, uploadTeacherDocument.single('document'), submitVerification);

router.get('/verifications/pending', requireSuperAdmin, listPendingVerifications);
router.patch('/verifications/:id/review', requireSuperAdmin, validate(reviewVerificationSchema), reviewVerification);
router.patch('/:teacherId/level', requireSuperAdmin, validate(updateTeacherLevelSchema), updateTeacherLevel);

module.exports = router;
