const Joi = require('joi');

const registerSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(80).required(),
  lastName: Joi.string().trim().min(2).max(80).required(),
  sex: Joi.string().valid('MALE', 'FEMALE', 'OTHER').required(),
  dateOfBirth: Joi.date().iso().required(),
  school: Joi.string().trim().min(2).max(120).required(),
  gradeLevel: Joi.string().trim().min(1).max(50).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  phone: Joi.string().trim().max(30).allow(null, ''),
  password: Joi.string().min(6).max(128).required()
});

const loginSchema = Joi.object({
  identifier: Joi.string().required(),
  password: Joi.string().required()
});

const acceptTeacherInviteSchema = Joi.object({
  token: Joi.string().trim().length(48).required(),
  firstName: Joi.string().trim().min(2).max(80).required(),
  lastName: Joi.string().trim().min(2).max(80).required(),
  password: Joi.string().min(8).max(128).required(),
  sex: Joi.string().valid('MALE', 'FEMALE', 'OTHER').default('OTHER'),
  dateOfBirth: Joi.date().iso().optional(),
  phone: Joi.string().trim().max(30).allow(null, '')
});

const forgotPasswordRequestSchema = Joi.object({
  phone: Joi.string().trim().min(6).max(30).required()
});

const forgotPasswordVerifySchema = Joi.object({
  phone: Joi.string().trim().min(6).max(30).required(),
  code: Joi.string().trim().pattern(/^\d{6}$/).required()
});

const forgotPasswordResetSchema = Joi.object({
  phone: Joi.string().trim().min(6).max(30).required(),
  code: Joi.string().trim().pattern(/^\d{6}$/).required(),
  newPassword: Joi.string().min(8).max(128).required()
});

const verifyEmailSchema = Joi.object({
  token: Joi.string().trim().min(32).max(256).required()
});

const resendVerificationEmailSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required()
});

const updateUnverifiedEmailSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  newEmail: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(6).max(128).required()
});

const quizParamsSchema = Joi.object({
  subjectId: Joi.number().integer().positive().required()
});

const quizQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(10),
  set: Joi.string().trim().max(50).optional(),
  premium: Joi.alternatives().try(
    Joi.boolean(),
    Joi.string().valid('1', '0', 'true', 'false')
  ).optional()
});

const submitQuizSchema = Joi.object({
  subjectId: Joi.number().integer().positive().required(),
  startedAt: Joi.date().iso().required(),
  durationSec: Joi.number().integer().min(1).max(7200).required(),
  answers: Joi.array()
    .items(
      Joi.object({
        questionId: Joi.number().integer().positive().required(),
        selectedOption: Joi.number().integer().min(0).max(3).required()
      })
    )
    .min(1)
    .required()
});

const createLibraryBookSchema = Joi.object({
  title: Joi.string().trim().min(3).max(180).required(),
  subject: Joi.string().trim().min(2).max(120).required(),
  level: Joi.string().trim().min(2).max(80).required(),
  description: Joi.string().trim().max(500).allow('', null)
});

const reviewLibraryBookSchema = Joi.object({
  status: Joi.string().valid('APPROVED', 'REJECTED').required()
});

module.exports = {
  registerSchema,
  loginSchema,
  acceptTeacherInviteSchema,
  forgotPasswordRequestSchema,
  forgotPasswordVerifySchema,
  forgotPasswordResetSchema,
  verifyEmailSchema,
  resendVerificationEmailSchema,
  updateUnverifiedEmailSchema,
  quizParamsSchema,
  quizQuerySchema,
  submitQuizSchema,
  createLibraryBookSchema,
  reviewLibraryBookSchema
};
