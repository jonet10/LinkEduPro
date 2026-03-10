const express = require('express');
const auth = require('../middlewares/auth');
const { requireRoles } = require('../middlewares/roles');
const { uploadExamPdf } = require('../middlewares/upload-exam-pdf');

const router = express.Router();

// Upload endpoint used by local sync scripts to push PDFs to production storage.
router.post('/', auth, requireRoles(['ADMIN', 'SUPER_ADMIN']), uploadExamPdf, (req, res) => {
  const storedName = req.file?.filename || '';
  if (!storedName) {
    return res.status(400).json({ message: 'Fichier manquant.' });
  }
  return res.status(201).json({
    fileName: storedName,
    url: `/storage/exam-pdfs/${encodeURIComponent(storedName)}`
  });
});

module.exports = router;

