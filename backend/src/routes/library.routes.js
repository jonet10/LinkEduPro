const express = require('express');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { requireRoles } = require('../middlewares/roles');
const { uploadLibraryBook } = require('../middlewares/upload-library');
const { listBooks, submitBook, reviewBook, updateBook, purchaseBook, softDeleteBook } = require('../controllers/library.controller');
const { createLibraryBookSchema, updateLibraryBookSchema, reviewLibraryBookSchema, createLibraryPurchaseSchema } = require('../services/validators');

const router = express.Router();

router.get('/books', auth, listBooks);
router.post('/books', auth, requireRoles(['ADMIN', 'TEACHER']), uploadLibraryBook, validate(createLibraryBookSchema), submitBook);
router.patch('/books/:id', auth, requireRoles(['ADMIN', 'TEACHER']), uploadLibraryBook, validate(updateLibraryBookSchema), updateBook);
router.post('/books/:id/purchase', auth, validate(createLibraryPurchaseSchema), purchaseBook);
router.patch('/books/:id/review', auth, requireRoles(['ADMIN']), validate(reviewLibraryBookSchema), reviewBook);
router.delete('/books/:id', auth, requireRoles(['ADMIN', 'TEACHER']), softDeleteBook);

module.exports = router;
