const express = require('express');
const validate = require('../../middlewares/validate');
const { requireRoles } = require('../../middlewares/roles');
const { uploadProfilePhoto } = require('../middlewares/upload-profile');
const {
  getMyProfile,
  updateMyProfile,
  uploadMyPhoto,
  setDarkMode,
  getDailyWelcomePopup
} = require('../controllers/profile.controller');
const { updateProfileSchema, darkModeSchema } = require('../validators/v2.validators');

const router = express.Router();

router.get('/me', getMyProfile);
router.get('/daily-welcome-popup', getDailyWelcomePopup);
router.patch('/me', requireRoles(['STUDENT', 'TEACHER']), validate(updateProfileSchema), updateMyProfile);
router.post('/photo', requireRoles(['STUDENT', 'TEACHER']), uploadProfilePhoto.single('photo'), uploadMyPhoto);
router.patch('/dark-mode', validate(darkModeSchema), setDarkMode);

module.exports = router;
