const express = require('express');
const { listSubjects } = require('../controllers/subject.controller');
const auth = require('../middlewares/auth');

const router = express.Router();

router.get('/', auth, listSubjects);

module.exports = router;
