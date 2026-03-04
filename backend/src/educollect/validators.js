const Joi = require('joi');

const projectIdParamsSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

const userIdParamsSchema = Joi.object({
  userId: Joi.number().integer().positive().required()
});

const listProjectsQuerySchema = Joi.object({
  mine: Joi.boolean().optional(),
  status: Joi.string()
    .valid('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'FUNDING', 'FUNDED', 'CLOSED', 'SUSPENDED')
    .optional()
});

const acceptRulesSchema = Joi.object({
  rulesVersion: Joi.string().trim().min(1).max(60).required()
});

const budgetItemSchema = Joi.object({
  label: Joi.string().trim().min(2).max(200).required(),
  amount: Joi.number().positive().required(),
  note: Joi.string().trim().max(500).allow('', null).optional()
});

const createProjectSchema = Joi.object({
  title: Joi.string().trim().min(6).max(180).required(),
  category: Joi.string().trim().min(2).max(80).required(),
  description: Joi.string().trim().min(30).max(8000).required(),
  targetAmount: Joi.number().positive().max(5000000).required(),
  budgetItems: Joi.alternatives().try(
    Joi.array().items(budgetItemSchema).min(1),
    Joi.string().trim().min(2)
  ).required(),
  deadline: Joi.date().iso().required(),
  school: Joi.string().trim().min(2).max(180).required(),
  teacherValidationText: Joi.string().trim().min(4).max(1200).required(),
  teacherValidationSignature: Joi.string().trim().max(500).allow('', null).optional()
});

const createDonationSchema = Joi.object({
  amount: Joi.number().positive().max(1000000).required(),
  paymentMethod: Joi.string().valid('MONCASH', 'NATCASH').required(),
  visibilityType: Joi.string().valid('PUBLIC', 'NAME_ONLY', 'ANONYMOUS').required(),
  transactionReference: Joi.string().trim().max(140).allow('', null).optional()
});

const submitReportSchema = Joi.object({
  content: Joi.string().trim().min(30).max(10000).required()
});

const reviewProjectSchema = Joi.object({
  decision: Joi.string().valid('APPROVED', 'REJECTED').required(),
  note: Joi.string().trim().max(1200).allow('', null).optional()
});

const suspendProjectSchema = Joi.object({
  reason: Joi.string().trim().min(4).max(1200).required()
});

const disburseProjectSchema = Joi.object({
  disbursedTo: Joi.string().trim().min(3).max(240).required(),
  note: Joi.string().trim().max(1200).allow('', null).optional()
});

const closeProjectSchema = Joi.object({
  note: Joi.string().trim().max(1200).allow('', null).optional()
});

const flagProjectSchema = Joi.object({
  reason: Joi.string().trim().min(4).max(500).required(),
  details: Joi.string().trim().max(2000).allow('', null).optional()
});

const verifyPartnerSchema = Joi.object({
  isVerified: Joi.boolean().required()
});

module.exports = {
  projectIdParamsSchema,
  userIdParamsSchema,
  listProjectsQuerySchema,
  acceptRulesSchema,
  createProjectSchema,
  createDonationSchema,
  submitReportSchema,
  reviewProjectSchema,
  suspendProjectSchema,
  disburseProjectSchema,
  closeProjectSchema,
  flagProjectSchema,
  verifyPartnerSchema
};
