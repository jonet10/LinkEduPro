const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDir = path.resolve(__dirname, '../../../storage/profile-photos');

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const uploadProfilePhoto = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedExt = /\.(jpg|jpeg|png|webp)$/i.test(file.originalname);

    if (!allowedMime.includes(file.mimetype) || !allowedExt) {
      return cb(new Error('Fichier invalide. Autorise: JPG/PNG/WEBP (max 5MB).'));
    }

    return cb(null, true);
  }
});

module.exports = { uploadProfilePhoto };
