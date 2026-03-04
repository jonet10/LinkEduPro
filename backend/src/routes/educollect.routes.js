const express = require('express');
const auth = require('../middlewares/auth');
const optionalAuth = require('../middlewares/optional-auth');
const validate = require('../middlewares/validate');
const { requireRoles } = require('../middlewares/roles');
const { uploadEduCollectProof } = require('../middlewares/upload-educollect');
const {
  listProjects,
  getProjectDetail,
  acceptRules,
  createProject,
  donateToProject,
  submitProjectReport,
  reviewProject,
  suspendProject,
  disburseProject,
  closeProject,
  flagProject,
  setPartnerVerification,
  getAdminDashboard
} = require('../educollect/controller');
const {
  projectIdParamsSchema,
  userIdParamsSchema,
  listProjectsQuerySchema,
  acceptRulesSchema,
  createProjectSchema,
  createDonationSchema,
  submitReportSchema,
  reviewProjectSchema,
  suspendProjectSchema,
  disburseProjectSchema,
  closeProjectSchema,
  flagProjectSchema,
  verifyPartnerSchema
} = require('../educollect/validators');

const router = express.Router();

router.get('/projects', optionalAuth, validate(listProjectsQuerySchema, 'query'), listProjects);
router.get('/projects/:id', optionalAuth, validate(projectIdParamsSchema, 'params'), getProjectDetail);

router.post('/rules/accept', auth, validate(acceptRulesSchema), acceptRules);
router.post('/projects', auth, requireRoles(['STUDENT']), uploadEduCollectProof, validate(createProjectSchema), createProject);
router.post('/projects/:id/donations', auth, validate(projectIdParamsSchema, 'params'), validate(createDonationSchema), donateToProject);
router.post('/projects/:id/reports', auth, validate(projectIdParamsSchema, 'params'), validate(submitReportSchema), submitProjectReport);
router.post('/projects/:id/flags', auth, validate(projectIdParamsSchema, 'params'), validate(flagProjectSchema), flagProject);

router.patch('/projects/:id/review', auth, requireRoles(['ADMIN']), validate(projectIdParamsSchema, 'params'), validate(reviewProjectSchema), reviewProject);
router.patch('/projects/:id/suspend', auth, requireRoles(['ADMIN']), validate(projectIdParamsSchema, 'params'), validate(suspendProjectSchema), suspendProject);
router.patch('/projects/:id/disburse', auth, requireRoles(['ADMIN']), validate(projectIdParamsSchema, 'params'), validate(disburseProjectSchema), disburseProject);
router.patch('/projects/:id/close', auth, requireRoles(['ADMIN']), validate(projectIdParamsSchema, 'params'), validate(closeProjectSchema), closeProject);

router.patch('/partners/:userId/verify', auth, requireRoles(['ADMIN']), validate(userIdParamsSchema, 'params'), validate(verifyPartnerSchema), setPartnerVerification);
router.get('/admin/dashboard', auth, requireRoles(['ADMIN']), getAdminDashboard);

module.exports = router;
