const express = require('express');
const validate = require('../../middlewares/validate');
const { requireRoles } = require('../../middlewares/roles');
const {
  createContent,
  listMySubmittedContent,
  listApprovedForMyLevel,
  listPendingContent,
  reviewContent,
  updateContent,
  deleteContent
} = require('../controllers/content.controller');
const { createContentSchema, reviewContentSchema, updateContentSchema } = require('../validators/v2.validators');

const router = express.Router();

router.post('/', requireRoles(['TEACHER', 'ADMIN']), validate(createContentSchema), createContent);
router.get('/mine', requireRoles(['TEACHER', 'ADMIN']), listMySubmittedContent);
router.get('/my-level', requireRoles(['STUDENT']), listApprovedForMyLevel);
router.get('/pending', requireRoles(['ADMIN']), listPendingContent);
router.patch('/:contentId/review', requireRoles(['ADMIN']), validate(reviewContentSchema), reviewContent);
router.patch('/:contentId', requireRoles(['TEACHER', 'ADMIN']), validate(updateContentSchema), updateContent);
router.delete('/:contentId', requireRoles(['TEACHER', 'ADMIN']), deleteContent);

module.exports = router;
