const express = require('express');
const validate = require('../../middlewares/validate');
const { requireRoles } = require('../../middlewares/roles');
const {
  createQuiz,
  listQuizzes,
  getQuizDetails,
  submitQuiz,
  getMyQuizResults
} = require('../controllers/quiz-v2.controller');
const {
  createLevelQuizSchema,
  submitLevelQuizSchema,
  quizListQuerySchema
} = require('../validators/v2.validators');

const router = express.Router();

router.get('/', validate(quizListQuerySchema, 'query'), listQuizzes);
router.post('/', requireRoles(['TEACHER', 'ADMIN']), validate(createLevelQuizSchema), createQuiz);
router.get('/results/me', getMyQuizResults);
router.get('/:quizId', getQuizDetails);
router.post('/:quizId/submit', requireRoles(['STUDENT']), validate(submitLevelQuizSchema), submitQuiz);

module.exports = router;
