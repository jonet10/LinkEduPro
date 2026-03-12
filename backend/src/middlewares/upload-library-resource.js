const multer = require('multer');
const path = require('path');
const { resolveStoragePath, ensureDir } = require('../config/storage');

function inferFileType(originalName, mimeType) {
  const name = String(originalName || '').toLowerCase();
  const ext = path.extname(name);
  if (mimeType === 'application/pdf' || ext === '.pdf') return 'pdf';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === '.docx') return 'docx';
  if (mimeType === 'application/vnd.ms-powerpoint' || mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || ext === '.ppt' || ext === '.pptx') return 'ppt';
  if (mimeType && mimeType.startsWith('image/')) return 'image';
  if (mimeType && mimeType.startsWith('audio/')) return 'audio';
  if (mimeType && mimeType.startsWith('video/')) return 'video';
  if (/\.(mp4|webm|ogg)$/i.test(name)) return 'video';
  if (/\.(mp3|wav|m4a|aac)$/i.test(name)) return 'audio';
  if (/\.(png|jpe?g|webp|gif)$/i.test(name)) return 'image';
  return 'other';
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    const targetDir = resolveStoragePath('library-resources');
    ensureDir(targetDir);
    cb(null, targetDir);
  },
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const kind = inferFileType(file.originalname, file.mimetype);
    if (!kind) {
      const error = new Error('Type de fichier non supporté.');
      error.status = 400;
      return cb(error);
    }
    req.libraryResourceFileType = kind;
    return cb(null, true);
  }
});

function uploadLibraryResource(req, res, next) {
  const handler = upload.single('file');
  handler(req, res, (error) => {
    if (!error) return next();

    if (error.name === 'MulterError') {
      const mapped = new Error(error.code === 'LIMIT_FILE_SIZE'
        ? 'Fichier trop volumineux (max 25MB).'
        : 'Erreur upload fichier.');
      mapped.status = 400;
      return next(mapped);
    }

    return next(error);
  });
}

module.exports = { uploadLibraryResource, inferFileType };

