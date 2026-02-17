const Joi = require('joi');

const startPomodoroSchema = Joi.object({
  workDuration: Joi.number().integer().min(5).max(180).default(25),
  breakDuration: Joi.number().integer().min(1).max(60).default(5),
  cycleType: Joi.string().valid('WORK', 'BREAK').default('WORK')
});

const stopPomodoroSchema = Joi.object({
  sessionId: Joi.number().integer().positive().optional()
});

const listenSongSchema = Joi.object({
  songId: Joi.number().integer().positive().required()
});

const customSongSchema = Joi.object({
  title: Joi.string().trim().min(2).max(180).required(),
  url: Joi.string().uri().required(),
  category: Joi.string().trim().max(60).allow('', null)
});

const songIdParamSchema = Joi.object({
  songId: Joi.number().integer().positive().required()
});

const updateSongSchema = Joi.object({
  title: Joi.string().trim().min(2).max(180).optional(),
  url: Joi.string().uri().optional(),
  category: Joi.string().trim().max(60).allow('', null).optional()
}).min(1);

const focusStatsQuerySchema = Joi.object({
  days: Joi.number().integer().min(1).max(30).default(7)
});

module.exports = {
  startPomodoroSchema,
  stopPomodoroSchema,
  listenSongSchema,
  customSongSchema,
  songIdParamSchema,
  updateSongSchema,
  focusStatsQuerySchema
};
