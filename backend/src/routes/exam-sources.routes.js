const express = require('express');
const auth = require('../middlewares/auth');
const { requireRoles } = require('../middlewares/roles');
const { uploadExamPdf } = require('../middlewares/upload-exam-pdf');
const { createExamSource } = require('../controllers/exam-sources.controller');

const router = express.Router();

router.post(
  '/sources',
  auth,
  requireRoles(['TEACHER', 'ADMIN', 'SUPER_ADMIN']),
  uploadExamPdf,
  createExamSource
);

module.exports = router;

