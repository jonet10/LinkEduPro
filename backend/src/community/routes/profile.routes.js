const express = require('express');
const { getUserProfile } = require('../controllers/profile.controller');

const router = express.Router();

router.get('/:userId', getUserProfile);

module.exports = router;
