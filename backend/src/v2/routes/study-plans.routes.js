const express = require('express');
const validate = require('../../middlewares/validate');
const { requireRoles } = require('../../middlewares/roles');
const {
  createStudyPlan,
  listStudyPlans,
  upsertPersonalStudyPlan,
  getMyStudyPlan
} = require('../controllers/study-plan.controller');
const {
  createStudyPlanSchema,
  upsertPersonalStudyPlanSchema,
  studyPlanQuerySchema
} = require('../validators/v2.validators');

const router = express.Router();

router.get('/', validate(studyPlanQuerySchema, 'query'), listStudyPlans);
router.post('/', requireRoles(['ADMIN']), validate(createStudyPlanSchema), createStudyPlan);
router.get('/my', requireRoles(['STUDENT']), getMyStudyPlan);
router.put('/personal', requireRoles(['STUDENT']), validate(upsertPersonalStudyPlanSchema), upsertPersonalStudyPlan);

module.exports = router;
