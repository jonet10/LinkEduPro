const express = require('express');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { requireRoles } = require('../middlewares/roles');
const { uploadLibraryPdf } = require('../middlewares/upload-library');
const { listBooks, submitBook, reviewBook, softDeleteBook } = require('../controllers/library.controller');
const { createLibraryBookSchema, reviewLibraryBookSchema } = require('../services/validators');

const router = express.Router();

router.get('/books', auth, listBooks);
router.post('/books', auth, requireRoles(['ADMIN', 'TEACHER']), uploadLibraryPdf.single('file'), validate(createLibraryBookSchema), submitBook);
router.patch('/books/:id/review', auth, requireRoles(['ADMIN']), validate(reviewLibraryBookSchema), reviewBook);
router.delete('/books/:id', auth, requireRoles(['ADMIN', 'TEACHER']), softDeleteBook);

module.exports = router;
