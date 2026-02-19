const express = require('express');
const auth = require('../middlewares/auth');
const optionalAuth = require('../middlewares/optional-auth');
const {
  listRecentBlogPosts,
  getPublicBlogPost,
  listProbableExercises,
  toggleProbableExerciseLike,
  addProbableExerciseComment,
  streamExamPdf
} = require('../controllers/public.controller');

const router = express.Router();

router.get('/blog/recent', listRecentBlogPosts);
router.get('/blog/posts/:postId', getPublicBlogPost);
router.get('/probable-exercises', optionalAuth, listProbableExercises);
router.get('/exam-pdfs/:fileName', streamExamPdf);
router.post('/probable-exercises/like', auth, toggleProbableExerciseLike);
router.post('/probable-exercises/comment', auth, addProbableExerciseComment);

module.exports = router;

