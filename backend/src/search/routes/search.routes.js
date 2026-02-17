const express = require('express');
const validate = require('../../middlewares/validate');
const auth = require('../../middlewares/auth');
const optionalAuth = require('../middlewares/optional-auth');
const {
  advancedSearch,
  getSuggestions,
  getSearchHistory,
  getTrendingSearches
} = require('../controllers/search.controller');
const {
  advancedSearchQuerySchema,
  suggestionsQuerySchema
} = require('../validators/search.validators');

const router = express.Router();

router.get('/advanced', optionalAuth, validate(advancedSearchQuerySchema, 'query'), advancedSearch);
router.get('/suggestions', optionalAuth, validate(suggestionsQuerySchema, 'query'), getSuggestions);
router.get('/history', auth, getSearchHistory);
router.get('/trending', getTrendingSearches);

module.exports = router;
