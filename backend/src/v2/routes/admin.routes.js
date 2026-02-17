const express = require('express');
const { requireRoles } = require('../../middlewares/roles');
const { getDashboard } = require('../controllers/admin.controller');

const router = express.Router();

router.get('/dashboard', requireRoles(['ADMIN']), getDashboard);

module.exports = router;
