const Joi = require('joi');

const sortDateSchema = Joi.string().valid('newest', 'oldest').default('newest');

const advancedSearchQuerySchema = Joi.object({
  q: Joi.string().trim().min(1).max(120).required(),
  category: Joi.string().valid('all', 'courses', 'publications', 'teachers', 'events').default('all'),
  date: sortDateSchema,
  popularity: Joi.alternatives().try(
    Joi.boolean(),
    Joi.string().valid('1', '0', 'true', 'false', 'most_viewed')
  ).optional(),
  author: Joi.string().trim().max(120).allow('', null),
  tags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(40)),
    Joi.string().trim().max(240)
  ).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10)
});

const suggestionsQuerySchema = Joi.object({
  q: Joi.string().trim().min(1).max(120).required(),
  category: Joi.string().valid('all', 'courses', 'publications', 'teachers', 'events').default('all')
});

module.exports = {
  advancedSearchQuerySchema,
  suggestionsQuerySchema
};
