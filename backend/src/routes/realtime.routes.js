const express = require('express');
const { streamRealtime } = require('../controllers/realtime.controller');

const router = express.Router();

router.get('/stream', streamRealtime);

module.exports = router;

