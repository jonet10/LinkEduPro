const multer = require('multer');
const { resolveStoragePath, ensureDir } = require('../config/storage');

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    const targetDir = resolveStoragePath('educollect', 'proofs');
    ensureDir(targetDir);
    cb(null, targetDir);
  },
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const uploader = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname);
    const isImage = /^image\/(jpeg|png|webp|jpg)$/i.test(file.mimetype) || /\.(jpe?g|png|webp)$/i.test(file.originalname);
    if (!isPdf && !isImage) {
      const error = new Error('Le justificatif doit être un PDF ou une image (JPG, PNG, WEBP).');
      error.status = 400;
      return cb(error);
    }
    return cb(null, true);
  }
});

function uploadEduCollectProof(req, res, next) {
  const handler = uploader.single('proof');
  handler(req, res, (error) => {
    if (!error) return next();

    if (error.name === 'MulterError') {
      const mapped = new Error(error.code === 'LIMIT_FILE_SIZE'
        ? 'Fichier trop volumineux (max 15MB).'
        : 'Erreur upload justificatif.');
      mapped.status = 400;
      return next(mapped);
    }
    return next(error);
  });
}

module.exports = { uploadEduCollectProof };
