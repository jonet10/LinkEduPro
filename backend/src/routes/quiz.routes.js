const express = require('express');
const {
  getQuizSets,
  getQuizQuestions,
  submitQuiz,
  getPremiumInsights,
  getQuizAttemptLikeState,
  toggleQuizAttemptLike
} = require('../controllers/quiz.controller');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { quizParamsSchema, quizAttemptParamsSchema, quizQuerySchema, submitQuizSchema } = require('../services/validators');

const router = express.Router();

router.get('/subject/:subjectId/sets', auth, validate(quizParamsSchema, 'params'), getQuizSets);
router.get('/subject/:subjectId/premium-insights', auth, validate(quizParamsSchema, 'params'), getPremiumInsights);
router.get('/subject/:subjectId', auth, validate(quizParamsSchema, 'params'), validate(quizQuerySchema, 'query'), getQuizQuestions);
router.post('/submit', auth, validate(submitQuizSchema), submitQuiz);
router.get('/attempt/:attemptId/like-state', auth, validate(quizAttemptParamsSchema, 'params'), getQuizAttemptLikeState);
router.post('/attempt/:attemptId/like-toggle', auth, validate(quizAttemptParamsSchema, 'params'), toggleQuizAttemptLike);

module.exports = router;
