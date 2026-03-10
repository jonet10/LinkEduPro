const multer = require('multer');
const path = require('path');
const { resolveStoragePath, ensureDir } = require('../config/storage');

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    const targetDir = resolveStoragePath('exam-pdfs');
    ensureDir(targetDir);
    cb(null, targetDir);
  },
  filename: (_, file, cb) => {
    const safe = path.basename(String(file.originalname || '')).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safe);
  }
});

const uploadExamPdfFile = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024, files: 1 },
  fileFilter: (_, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname);
    if (!isPdf) {
      const error = new Error('Le fichier doit etre un PDF.');
      error.status = 400;
      return cb(error);
    }
    return cb(null, true);
  }
}).single('file');

function uploadExamPdf(req, res, next) {
  uploadExamPdfFile(req, res, (error) => {
    if (!error) return next();

    if (error.name === 'MulterError') {
      const mapped = new Error(error.code === 'LIMIT_FILE_SIZE'
        ? 'Fichier trop volumineux (max 30MB).'
        : 'Erreur upload fichier.');
      mapped.status = 400;
      return next(mapped);
    }

    return next(error);
  });
}

module.exports = { uploadExamPdf };

