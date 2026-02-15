const express = require('express');
const { getQuizSets, getQuizQuestions, submitQuiz } = require('../controllers/quiz.controller');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { quizParamsSchema, quizQuerySchema, submitQuizSchema } = require('../services/validators');

const router = express.Router();

router.get('/subject/:subjectId/sets', auth, validate(quizParamsSchema, 'params'), getQuizSets);
router.get('/subject/:subjectId', auth, validate(quizParamsSchema, 'params'), validate(quizQuerySchema, 'query'), getQuizQuestions);
router.post('/submit', auth, validate(submitQuizSchema), submitQuiz);

module.exports = router;
