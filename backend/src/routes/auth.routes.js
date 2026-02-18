const express = require('express');
const {
  register,
  login,
  acceptTeacherInvite,
  validateTeacherInvite,
  requestPasswordReset,
  verifyResetCode,
  resetPasswordWithCode
} = require('../controllers/auth.controller');
const validate = require('../middlewares/validate');
const {
  registerSchema,
  loginSchema,
  acceptTeacherInviteSchema,
  forgotPasswordRequestSchema,
  forgotPasswordVerifySchema,
  forgotPasswordResetSchema
} = require('../services/validators');

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/forgot-password/request', validate(forgotPasswordRequestSchema), requestPasswordReset);
router.post('/forgot-password/verify', validate(forgotPasswordVerifySchema), verifyResetCode);
router.post('/forgot-password/reset', validate(forgotPasswordResetSchema), resetPasswordWithCode);
router.get('/teacher/invite/:token', validateTeacherInvite);
router.post('/teacher/accept-invite', validate(acceptTeacherInviteSchema), acceptTeacherInvite);

module.exports = router;
