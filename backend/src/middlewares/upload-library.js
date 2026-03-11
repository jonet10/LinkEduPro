const multer = require('multer');
const { resolveStoragePath, ensureDir } = require('../config/storage');

const storage = multer.diskStorage({
  destination: (_, file, cb) => {
    const targetDir = file.fieldname === 'coverImage'
      ? resolveStoragePath('library-books', 'covers')
      : resolveStoragePath('library-books', 'pdfs');
    ensureDir(targetDir);
    cb(null, targetDir);
  },
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const uploadLibraryFiles = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024, files: 2 },
  fileFilter: (_, file, cb) => {
    if (file.fieldname === 'file') {
      const isPdf = file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname);
      if (!isPdf) {
        const error = new Error('Le corps du livre doit être un PDF.');
        error.status = 400;
        return cb(error);
      }
      return cb(null, true);
    }

    if (file.fieldname === 'coverImage') {
      const isImage = /^image\/(jpeg|png|webp|jpg)$/i.test(file.mimetype) || /\.(jpe?g|png|webp)$/i.test(file.originalname);
      if (!isImage) {
        const error = new Error('La couverture doit être une image JPG, PNG ou WEBP.');
        error.status = 400;
        return cb(error);
      }
      return cb(null, true);
    }

    const error = new Error('Champ fichier non supporté.');
    error.status = 400;
    return cb(error);
  }
});

function uploadLibraryBook(req, res, next) {
  const handler = uploadLibraryFiles.fields([
    { name: 'file', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]);

  handler(req, res, (error) => {
    if (!error) return next();

    if (error.name === 'MulterError') {
      const mapped = new Error(error.code === 'LIMIT_FILE_SIZE'
        ? 'Fichier trop volumineux (max 20MB).'
        : 'Erreur upload fichier.');
      mapped.status = 400;
      return next(mapped);
    }

    return next(error);
  });
}

module.exports = { uploadLibraryBook };
