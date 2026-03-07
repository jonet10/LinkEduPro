const express = require('express');
const {
  getQuizSets,
  getQuizQuestions,
  submitQuiz,
  getPremiumInsights,
  getQuizAttemptLikeState,
  toggleQuizAttemptLike,
  listQuizQuestionsForManage,
  createQuizQuestion,
  updateQuizQuestion
} = require('../controllers/quiz.controller');
const auth = require('../middlewares/auth');
const { requireRoles } = require('../middlewares/roles');
const validate = require('../middlewares/validate');
const {
  quizParamsSchema,
  quizAttemptParamsSchema,
  quizQuestionParamsSchema,
  quizQuerySchema,
  submitQuizSchema,
  createQuizQuestionSchema,
  updateQuizQuestionSchema
} = require('../services/validators');

const router = express.Router();

router.get('/subject/:subjectId/sets', auth, validate(quizParamsSchema, 'params'), getQuizSets);
router.get('/subject/:subjectId/premium-insights', auth, validate(quizParamsSchema, 'params'), getPremiumInsights);
router.get('/subject/:subjectId', auth, validate(quizParamsSchema, 'params'), validate(quizQuerySchema, 'query'), getQuizQuestions);
router.get('/subject/:subjectId/manage/questions', auth, requireRoles(['ADMIN', 'TEACHER', 'SUPER_ADMIN']), validate(quizParamsSchema, 'params'), listQuizQuestionsForManage);
router.post('/subject/:subjectId/questions', auth, requireRoles(['ADMIN', 'TEACHER', 'SUPER_ADMIN']), validate(quizParamsSchema, 'params'), validate(createQuizQuestionSchema), createQuizQuestion);
router.patch('/questions/:questionId', auth, requireRoles(['ADMIN', 'TEACHER', 'SUPER_ADMIN']), validate(quizQuestionParamsSchema, 'params'), validate(updateQuizQuestionSchema), updateQuizQuestion);
router.post('/submit', auth, validate(submitQuizSchema), submitQuiz);
router.get('/attempt/:attemptId/like-state', auth, validate(quizAttemptParamsSchema, 'params'), getQuizAttemptLikeState);
router.post('/attempt/:attemptId/like-toggle', auth, validate(quizAttemptParamsSchema, 'params'), toggleQuizAttemptLike);

module.exports = router;
