const express = require('express');
const { listRecentBlogPosts, getPublicBlogPost, listProbableExercises } = require('../controllers/public.controller');

const router = express.Router();

router.get('/blog/recent', listRecentBlogPosts);
router.get('/blog/posts/:postId', getPublicBlogPost);
router.get('/probable-exercises', listProbableExercises);

module.exports = router;

