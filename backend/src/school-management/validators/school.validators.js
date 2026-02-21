const Joi = require('joi');

const schoolLoginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().required()
});

const schoolChangePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).max(128).required()
});

const createSchoolSchema = Joi.object({
  name: Joi.string().trim().min(2).max(180).required(),
  type: Joi.string().valid('PUBLIC', 'PRIVATE', 'OTHER').required(),
  phone: Joi.string().trim().min(6).max(40).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  address: Joi.string().trim().min(4).max(255).required(),
  department: Joi.string().trim().min(2).max(120).required(),
  commune: Joi.string().trim().min(2).max(120).required(),
  city: Joi.string().trim().min(2).max(120).required(),
  country: Joi.string().trim().min(2).max(120).required(),
  logo: Joi.string().uri().allow(null, ''),
  adminFirstName: Joi.string().trim().min(2).max(100).required(),
  adminLastName: Joi.string().trim().min(2).max(100).required(),
  adminPhone: Joi.string().trim().max(40).allow(null, '')
});

const updateSchoolSchema = Joi.object({
  name: Joi.string().trim().min(2).max(180).required(),
  type: Joi.string().valid('PUBLIC', 'PRIVATE', 'OTHER').required(),
  phone: Joi.string().trim().min(6).max(40).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  address: Joi.string().trim().min(4).max(255).required(),
  department: Joi.string().trim().min(2).max(120).required(),
  commune: Joi.string().trim().min(2).max(120).required(),
  city: Joi.string().trim().min(2).max(120).required(),
  country: Joi.string().trim().min(2).max(120).required(),
  logo: Joi.string().uri().allow(null, '')
});

const setSchoolStatusSchema = Joi.object({
  isActive: Joi.boolean().required(),
  reason: Joi.string().trim().max(255).allow('', null)
});

const createAcademicYearSchema = Joi.object({
  label: Joi.string().trim().min(4).max(30).required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
  isActive: Joi.boolean().default(false)
});

const createClassSchema = Joi.object({
  schoolId: Joi.number().integer().positive().required(),
  academicYearId: Joi.number().integer().positive().required(),
  name: Joi.string().trim().min(1).max(120).required(),
  level: Joi.string().trim().max(50).allow(null, ''),
  capacity: Joi.number().integer().min(1).max(1000).allow(null)
});

const updateClassSchema = Joi.object({
  academicYearId: Joi.number().integer().positive().required(),
  name: Joi.string().trim().min(1).max(120).required(),
  level: Joi.string().trim().max(50).allow(null, ''),
  capacity: Joi.number().integer().min(1).max(1000).allow(null)
});

const updateStudentSchema = Joi.object({
  classId: Joi.number().integer().positive().required(),
  academicYearId: Joi.number().integer().positive().required(),
  studentId: Joi.string().trim().min(2).max(80).required(),
  firstName: Joi.string().trim().min(1).max(120).required(),
  lastName: Joi.string().trim().min(1).max(120).required(),
  sex: Joi.string().valid('MALE', 'FEMALE', 'OTHER').required()
});

const createPaymentTypeSchema = Joi.object({
  schoolId: Joi.number().integer().positive().required(),
  name: Joi.string().trim().min(2).max(120).required(),
  description: Joi.string().trim().max(255).allow(null, '')
});

const createPaymentSchema = Joi.object({
  schoolId: Joi.number().integer().positive().required(),
  studentId: Joi.number().integer().positive().required(),
  classId: Joi.number().integer().positive().required(),
  academicYearId: Joi.number().integer().positive().required(),
  paymentTypeId: Joi.number().integer().positive().required(),
  isInstallment: Joi.boolean().default(false),
  amountDue: Joi.number().positive().required(),
  amountPaid: Joi.number().min(0).required(),
  notes: Joi.string().trim().max(500).allow(null, '')
});

module.exports = {
  schoolLoginSchema,
  schoolChangePasswordSchema,
  createSchoolSchema,
  updateSchoolSchema,
  setSchoolStatusSchema,
  createAcademicYearSchema,
  createClassSchema,
  updateClassSchema,
  updateStudentSchema,
  createPaymentTypeSchema,
  createPaymentSchema
};
