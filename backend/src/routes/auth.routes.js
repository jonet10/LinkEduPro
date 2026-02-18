const express = require('express');
const {
  register,
  login,
  acceptTeacherInvite,
  validateTeacherInvite,
  verifyEmail,
  verifyEmailByLink,
  resendVerificationEmail,
  updateUnverifiedEmail,
  requestPasswordReset,
  verifyResetCode,
  resetPasswordWithCode
} = require('../controllers/auth.controller');
const validate = require('../middlewares/validate');
const loginRateLimit = require('../middlewares/login-rate-limit');
const {
  registerSchema,
  loginSchema,
  acceptTeacherInviteSchema,
  verifyEmailSchema,
  resendVerificationEmailSchema,
  updateUnverifiedEmailSchema,
  forgotPasswordRequestSchema,
  forgotPasswordVerifySchema,
  forgotPasswordResetSchema
} = require('../services/validators');

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', loginRateLimit, validate(loginSchema), login);
router.get('/verify-email', verifyEmailByLink);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/resend-verification-email', validate(resendVerificationEmailSchema), resendVerificationEmail);
router.post('/update-unverified-email', validate(updateUnverifiedEmailSchema), updateUnverifiedEmail);
router.post('/forgot-password/request', validate(forgotPasswordRequestSchema), requestPasswordReset);
router.post('/forgot-password/verify', validate(forgotPasswordVerifySchema), verifyResetCode);
router.post('/forgot-password/reset', validate(forgotPasswordResetSchema), resetPasswordWithCode);
router.get('/teacher/invite/:token', validateTeacherInvite);
router.post('/teacher/accept-invite', validate(acceptTeacherInviteSchema), acceptTeacherInvite);

module.exports = router;
