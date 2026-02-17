const express = require('express');
const auth = require('../../middlewares/auth');

const router = express.Router();

router.use(auth);

router.use('/profile', require('./profile.routes'));
router.use('/focus', require('./focus.routes'));
router.use('/contents', require('./content.routes'));
router.use('/study-plans', require('./study-plans.routes'));
router.use('/quizzes', require('./quizzes.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
