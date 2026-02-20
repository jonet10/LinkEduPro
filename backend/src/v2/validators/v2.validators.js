const Joi = require('joi');

const levelSchema = Joi.string().valid('9e', 'NS1', 'NS2', 'NS3', 'Terminale', 'Universite');
const academicLevelSchema = Joi.string().valid('9e', 'NSI', 'NSII', 'NSIII', 'NSIV', 'Universitaire');
const contentTypeSchema = Joi.string().valid('quiz', 'pdf', 'video', 'revision');
const contentStatusSchema = Joi.string().valid('draft', 'pending', 'approved', 'rejected');

const updateProfileSchema = Joi.object({
  phone: Joi.string().trim().max(30).allow(null, ''),
  email: Joi.string().email({ tlds: { allow: false } }).allow(null, ''),
  address: Joi.string().trim().max(255).allow(null, ''),
  school: Joi.string().trim().max(255).allow(null, ''),
  gradeLevel: Joi.string().trim().max(120).allow(null, ''),
  password: Joi.string().min(8).max(128),
  level: academicLevelSchema.optional()
}).min(1);

const darkModeSchema = Joi.object({
  darkMode: Joi.boolean().required()
});

const createMusicTrackSchema = Joi.object({
  title: Joi.string().trim().min(2).max(180).required(),
  url: Joi.string().uri().required(),
  level: levelSchema.required()
});

const logPomodoroSessionSchema = Joi.object({
  duration: Joi.number().integer().min(1).max(600).required()
});

const dailyStatsQuerySchema = Joi.object({
  date: Joi.date().iso().optional()
});

const focusMusicQuerySchema = Joi.object({
  level: levelSchema.optional()
});

const createContentSchema = Joi.object({
  title: Joi.string().trim().min(3).max(180).required(),
  body: Joi.string().trim().min(10).max(20000).required(),
  level: levelSchema.required(),
  type: contentTypeSchema.required(),
  status: contentStatusSchema.optional()
});

const reviewContentSchema = Joi.object({
  action: Joi.string().valid('approved', 'rejected').required()
});

const createStudyPlanSchema = Joi.object({
  level: levelSchema.required(),
  subject: Joi.string().trim().max(120).allow(null, ''),
  chapterOrder: Joi.number().integer().min(1).max(500).optional(),
  title: Joi.string().trim().min(3).max(180).required(),
  description: Joi.string().trim().min(10).max(5000).required(),
  notes: Joi.string().trim().min(3).max(20000).allow(null, ''),
  exercises: Joi.string().trim().min(3).max(20000).allow(null, '')
});

const upsertPersonalStudyPlanSchema = Joi.object({
  customPreferences: Joi.object().unknown(true).allow(null),
  examDate: Joi.date().iso().allow(null)
});

const studyPlanQuerySchema = Joi.object({
  level: levelSchema.optional(),
  subject: Joi.string().trim().max(120).optional()
});

const studyPlanParamsSchema = Joi.object({
  planId: Joi.number().integer().positive().required()
});

const updateStudyPlanSchema = Joi.object({
  level: levelSchema.optional(),
  subject: Joi.string().trim().max(120).allow(null, ''),
  chapterOrder: Joi.number().integer().min(1).max(500).optional(),
  title: Joi.string().trim().min(3).max(180).optional(),
  description: Joi.string().trim().min(10).max(5000).optional(),
  notes: Joi.string().trim().min(3).max(20000).allow(null, ''),
  exercises: Joi.string().trim().min(3).max(20000).allow(null, '')
}).min(1);

const createLevelQuizSchema = Joi.object({
  level: levelSchema.required(),
  title: Joi.string().trim().min(3).max(180).required(),
  questions: Joi.array()
    .items(
      Joi.object({
        questionText: Joi.string().trim().min(5).max(1000).required(),
        options: Joi.array().items(Joi.string().trim().min(1).max(500)).min(2).max(8).required(),
        correctAnswer: Joi.string().trim().min(1).max(500).required()
      })
    )
    .min(1)
    .required()
});

const submitLevelQuizSchema = Joi.object({
  answers: Joi.array()
    .items(
      Joi.object({
        questionId: Joi.number().integer().positive().required(),
        answer: Joi.string().trim().allow('').required()
      })
    )
    .min(1)
    .required()
});

const quizListQuerySchema = Joi.object({
  level: levelSchema.optional()
});

module.exports = {
  updateProfileSchema,
  darkModeSchema,
  createMusicTrackSchema,
  logPomodoroSessionSchema,
  dailyStatsQuerySchema,
  focusMusicQuerySchema,
  createContentSchema,
  reviewContentSchema,
  createStudyPlanSchema,
  upsertPersonalStudyPlanSchema,
  studyPlanQuerySchema,
  studyPlanParamsSchema,
  updateStudyPlanSchema,
  createLevelQuizSchema,
  submitLevelQuizSchema,
  quizListQuerySchema
};
