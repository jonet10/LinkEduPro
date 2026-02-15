const express = require('express');
const { getProgress } = require('../controllers/result.controller');
const auth = require('../middlewares/auth');

const router = express.Router();

router.get('/progress', auth, getProgress);

module.exports = router;
