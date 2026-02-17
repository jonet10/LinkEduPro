const express = require('express');
const { listRecentBlogPosts } = require('../controllers/public.controller');

const router = express.Router();

router.get('/blog/recent', listRecentBlogPosts);

module.exports = router;

