const Joi = require('joi');

const registerSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(80).required(),
  lastName: Joi.string().trim().min(2).max(80).required(),
  role: Joi.string().valid('STUDENT', 'TEACHER', 'SCHOOL_ADMIN').default('STUDENT'),
  academicLevel: Joi.when('role', {
    is: 'STUDENT',
    then: Joi.string().valid('9e', 'NSI', 'NSII', 'NSIII', 'NSIV', 'Universitaire').required(),
    otherwise: Joi.forbidden()
  }),
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
  email: Joi.string().email({ tlds: { allow: false } }).required()
});

const forgotPasswordVerifySchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  code: Joi.string().trim().pattern(/^\d{6}$/).required()
});

const forgotPasswordResetSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
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
const quizAttemptParamsSchema = Joi.object({
  attemptId: Joi.number().integer().positive().required()
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

const privateMessageSchema = Joi.object({
  recipientId: Joi.number().integer().positive().required(),
  content: Joi.string().trim().min(1).max(5000).required()
});

const globalMessageSchema = Joi.object({
  content: Joi.string().trim().min(1).max(5000).required(),
  audience: Joi.string().valid('ALL', 'LEVEL').default('ALL'),
  level: Joi.when('audience', {
    is: 'LEVEL',
    then: Joi.string().valid('9e', 'NSI', 'NSII', 'NSIII', 'NSIV', 'Universitaire').required(),
    otherwise: Joi.forbidden()
  })
});

const catchupSessionCreateSchema = Joi.object({
  title: Joi.string().trim().min(3).max(180).required(),
  subject: Joi.string().trim().min(2).max(120).required(),
  description: Joi.string().trim().max(5000).allow('', null),
  meetUrl: Joi.string().uri().pattern(/^https:\/\/meet\.google\.com\/.+/i).required(),
  invitationScope: Joi.string().valid('GLOBAL', 'TEACHERS', 'TEACHER', 'SCHOOL').default('GLOBAL'),
  targetSchool: Joi.when('invitationScope', {
    is: 'SCHOOL',
    then: Joi.string().trim().min(2).max(160).required(),
    otherwise: Joi.string().trim().max(160).allow('', null)
  }),
  targetTeacherId: Joi.when('invitationScope', {
    is: 'TEACHER',
    then: Joi.number().integer().positive().required(),
    otherwise: Joi.number().integer().positive().allow(null)
  }),
  invitationMessage: Joi.string().trim().max(1000).allow('', null),
  startsAt: Joi.date().iso().required(),
  endsAt: Joi.date().iso().required()
});

const catchupSessionUpdateSchema = Joi.object({
  title: Joi.string().trim().min(3).max(180),
  subject: Joi.string().trim().min(2).max(120),
  description: Joi.string().trim().max(5000).allow('', null),
  meetUrl: Joi.string().uri().pattern(/^https:\/\/meet\.google\.com\/.+/i),
  invitationScope: Joi.string().valid('GLOBAL', 'TEACHERS', 'TEACHER', 'SCHOOL'),
  targetSchool: Joi.string().trim().max(160).allow('', null),
  targetTeacherId: Joi.number().integer().positive().allow(null),
  invitationMessage: Joi.string().trim().max(1000).allow('', null),
  startsAt: Joi.date().iso(),
  endsAt: Joi.date().iso(),
  isActive: Joi.boolean()
}).min(1);

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
  quizAttemptParamsSchema,
  quizQuerySchema,
  submitQuizSchema,
  createLibraryBookSchema,
  reviewLibraryBookSchema,
  privateMessageSchema,
  globalMessageSchema,
  catchupSessionCreateSchema,
  catchupSessionUpdateSchema
};
