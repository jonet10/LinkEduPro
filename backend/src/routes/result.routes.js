const express = require('express');
const { getProgress, getCommunity } = require('../controllers/result.controller');
const auth = require('../middlewares/auth');

const router = express.Router();

router.get('/progress', auth, getProgress);
router.get('/community', auth, getCommunity);

module.exports = router;
