const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    cb(null, path.resolve(__dirname, '../../../storage/teacher-verifications'));
  },
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const uploadTeacherDocument = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowedMime = ['application/pdf', 'image/jpeg', 'image/png'];
    const allowedExt = /\.(pdf|jpg|jpeg|png)$/i.test(file.originalname);
    if (!allowedMime.includes(file.mimetype) || !allowedExt) {
      return cb(new Error('Fichier invalide. Autorise: PDF/JPG/PNG (max 5MB).'));
    }
    return cb(null, true);
  }
});

module.exports = { uploadTeacherDocument };
