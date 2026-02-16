const Joi = require('joi');

const createPostSchema = Joi.object({
  title: Joi.string().trim().min(5).max(180).required(),
  content: Joi.string().trim().min(20).max(10000).required(),
  excerpt: Joi.string().trim().max(400).allow('', null),
  isGlobal: Joi.boolean().default(true),
  schoolId: Joi.number().integer().positive().allow(null),
  categoryIds: Joi.array().items(Joi.number().integer().positive()).default([]),
  tagIds: Joi.array().items(Joi.number().integer().positive()).default([])
});

const createCommentSchema = Joi.object({
  content: Joi.string().trim().min(2).max(2000).required()
});

const reportPostSchema = Joi.object({
  reason: Joi.string().trim().min(3).max(120).required(),
  details: Joi.string().trim().max(1000).allow('', null)
});

const reviewVerificationSchema = Joi.object({
  status: Joi.string().valid('APPROVED', 'REJECTED').required()
});

const updateTeacherLevelSchema = Joi.object({
  teacherLevel: Joi.string().valid('STANDARD', 'VERIFIED', 'CERTIFIED', 'PREMIUM').required()
});

const updateConfigSchema = Joi.object({
  maxPostsPerDay: Joi.number().integer().min(1).max(100).required(),
  maxPostsPerMonth: Joi.number().integer().min(1).max(1000).required(),
  commentRatePerMin: Joi.number().integer().min(1).max(120).required()
});

const createTeacherInvitationSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  expiresInHours: Joi.number().integer().min(1).max(168).default(72)
});

const createCategorySchema = Joi.object({
  name: Joi.string().trim().min(2).max(80).required(),
  slug: Joi.string().trim().min(2).max(80).optional(),
  description: Joi.string().trim().max(255).allow('', null)
});

const createTagSchema = Joi.object({
  name: Joi.string().trim().min(2).max(60).required(),
  slug: Joi.string().trim().min(2).max(80).optional()
});

const reviewReportSchema = Joi.object({
  status: Joi.string().valid('RESOLVED', 'REJECTED').required()
});

module.exports = {
  createPostSchema,
  createCommentSchema,
  reportPostSchema,
  reviewVerificationSchema,
  updateTeacherLevelSchema,
  updateConfigSchema,
  createTeacherInvitationSchema,
  createCategorySchema,
  createTagSchema,
  reviewReportSchema
};
