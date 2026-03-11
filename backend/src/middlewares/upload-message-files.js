const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { resolveStoragePath, ensureDir } = require('../config/storage');

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB per file
const MAX_FILES = 5;

const allowedExtensions = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.txt',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.zip',
  '.rar'
]);

function safeBaseName(value) {
  return String(value || '')
    .replace(/\.[^.]+$/g, '')
    .trim()
    .slice(0, 120)
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'fichier';
}

function isAllowedFile(file) {
  const ext = path.extname(String(file.originalname || '')).toLowerCase();
  if (!allowedExtensions.has(ext)) return false;

  const mime = String(file.mimetype || '').toLowerCase();
  if (!mime) return true;

  if (mime === 'application/pdf') return true;
  if (mime.startsWith('image/')) return true;
  if (mime === 'text/plain') return true;

  if (mime === 'application/zip' || mime === 'application/x-zip-compressed') return true;
  if (mime === 'application/vnd.rar' || mime === 'application/x-rar-compressed') return true;

  if (mime === 'application/msword') return true;
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return true;
  if (mime === 'application/vnd.ms-excel') return true;
  if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return true;
  if (mime === 'application/vnd.ms-powerpoint') return true;
  if (mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') return true;

  return true;
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    const dir = resolveStoragePath('message-files');
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_, file, cb) => {
    const ext = path.extname(String(file.originalname || '')).toLowerCase() || '';
    const base = safeBaseName(file.originalname);
    const nonce = crypto.randomBytes(5).toString('hex');
    const name = `${Date.now()}_${nonce}_${base}${ext}`.slice(0, 220);
    cb(null, name);
  }
});

const uploadMessageFilesInternal = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: MAX_FILES },
  fileFilter: (_, file, cb) => {
    if (!isAllowedFile(file)) {
      const error = new Error('Type de fichier non autorisé.');
      error.status = 400;
      return cb(error);
    }
    return cb(null, true);
  }
}).array('files', MAX_FILES);

function uploadMessageFiles(req, res, next) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  if (!contentType.includes('multipart/form-data')) {
    return next();
  }

  uploadMessageFilesInternal(req, res, (error) => {
    if (!error) return next();

    if (error.name === 'MulterError') {
      const mapped = new Error(error.code === 'LIMIT_FILE_SIZE'
        ? 'Fichier trop volumineux (max 15MB).'
        : (error.code === 'LIMIT_FILE_COUNT'
          ? `Trop de fichiers (max ${MAX_FILES}).`
          : 'Erreur upload fichier.'));
      mapped.status = 400;
      return next(mapped);
    }

    return next(error);
  });
}

module.exports = { uploadMessageFiles };
