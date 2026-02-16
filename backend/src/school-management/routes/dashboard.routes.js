const express = require('express');
const requireSchoolRoles = require('../middlewares/school-rbac');
const enforceSchoolScope = require('../middlewares/school-scope');
const { getSchoolDashboard, getSuperAdminDashboard } = require('../controllers/dashboard.controller');

const router = express.Router();

router.get('/schools/:schoolId', enforceSchoolScope((req) => req.params.schoolId), getSchoolDashboard);
router.get('/super-admin', requireSchoolRoles(['SUPER_ADMIN']), getSuperAdminDashboard);

module.exports = router;
