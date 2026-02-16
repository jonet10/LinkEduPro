const express = require('express');
const auth = require('../../middlewares/auth');
const { ensureCommunityBootstrapped } = require('../middlewares/bootstrap');

const router = express.Router();

router.use(auth);
router.use(ensureCommunityBootstrapped);

router.use('/teachers', require('./teacher.routes'));
router.use('/blog', require('./blog.routes'));
router.use('/admin', require('./admin.routes'));
router.use('/profiles', require('./profile.routes'));

module.exports = router;
