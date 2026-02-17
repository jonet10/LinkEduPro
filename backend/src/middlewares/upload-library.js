const path = require('path');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (_, __, cb) => {
    cb(null, path.resolve(__dirname, '../../storage/library-books'));
  },
  filename: (_, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  }
});

const uploadLibraryPdf = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname);
    if (!allowed) {
      return cb(new Error('Seuls les fichiers PDF sont autorises.'));
    }
    return cb(null, true);
  }
});

module.exports = { uploadLibraryPdf };
