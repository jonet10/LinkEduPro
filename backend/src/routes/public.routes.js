const express = require('express');
const { listRecentBlogPosts, getPublicBlogPost } = require('../controllers/public.controller');

const router = express.Router();

router.get('/blog/recent', listRecentBlogPosts);
router.get('/blog/posts/:postId', getPublicBlogPost);

module.exports = router;

