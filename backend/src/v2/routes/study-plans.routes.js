const express = require('express');
const validate = require('../../middlewares/validate');
const { requireRoles } = require('../../middlewares/roles');
const {
  createStudyPlan,
  listStudyPlans,
  upsertPersonalStudyPlan,
  getMyStudyPlan,
  updateStudyPlan,
  deleteStudyPlan
} = require('../controllers/study-plan.controller');
const {
  createStudyPlanSchema,
  upsertPersonalStudyPlanSchema,
  studyPlanQuerySchema,
  studyPlanParamsSchema,
  updateStudyPlanSchema
} = require('../validators/v2.validators');

const router = express.Router();

router.get('/', validate(studyPlanQuerySchema, 'query'), listStudyPlans);
router.post('/', requireRoles(['ADMIN', 'TEACHER']), validate(createStudyPlanSchema), createStudyPlan);
router.patch('/:planId', requireRoles(['ADMIN', 'TEACHER']), validate(studyPlanParamsSchema, 'params'), validate(updateStudyPlanSchema), updateStudyPlan);
router.delete('/:planId', requireRoles(['ADMIN', 'TEACHER']), validate(studyPlanParamsSchema, 'params'), deleteStudyPlan);
router.get('/my', requireRoles(['STUDENT']), getMyStudyPlan);
router.put('/personal', requireRoles(['STUDENT']), validate(upsertPersonalStudyPlanSchema), upsertPersonalStudyPlan);

module.exports = router;
