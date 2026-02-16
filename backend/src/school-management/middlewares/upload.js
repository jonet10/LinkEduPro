const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    cb(null, path.resolve(__dirname, '../../../storage/school-imports'));
  },
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const uploadStudentImport = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const valid = /\.(xlsx|csv)$/i.test(file.originalname);
    if (!valid) {
      return cb(new Error('Format non supporte. Utiliser .xlsx ou .csv'));
    }
    return cb(null, true);
  }
});

module.exports = { uploadStudentImport };
