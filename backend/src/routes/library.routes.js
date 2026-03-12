const express = require('express');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { requireRoles } = require('../middlewares/roles');
const { uploadLibraryBook } = require('../middlewares/upload-library');
const { uploadLibraryResource } = require('../middlewares/upload-library-resource');
const { listBooks, submitBook, reviewBook, updateBook, purchaseBook, softDeleteBook } = require('../controllers/library.controller');
const {
  createLibraryBookSchema,
  updateLibraryBookSchema,
  reviewLibraryBookSchema,
  createLibraryPurchaseSchema,
  createLibraryResourceSchema,
  updateLibraryResourceSchema,
  createDictionaryTermSchema,
  addFavoriteSchema
} = require('../services/validators');
const {
  listResources,
  getResource,
  createResource,
  updateResource,
  deleteResource,
  listDictionaryTerms,
  suggestDictionaryTerms,
  getDictionaryTerm,
  createDictionaryTerm,
  listFavorites,
  addFavorite,
  removeFavorite,
  librarySearch,
  reindexLibrary
} = require('../controllers/library-v2.controller');

const router = express.Router();

router.get('/books', auth, listBooks);
router.post('/books', auth, requireRoles(['ADMIN', 'TEACHER', 'STUDENT']), uploadLibraryBook, validate(createLibraryBookSchema), submitBook);
router.patch('/books/:id', auth, requireRoles(['ADMIN', 'TEACHER', 'STUDENT']), uploadLibraryBook, validate(updateLibraryBookSchema), updateBook);
router.post('/books/:id/purchase', auth, validate(createLibraryPurchaseSchema), purchaseBook);
router.patch('/books/:id/review', auth, requireRoles(['ADMIN']), validate(reviewLibraryBookSchema), reviewBook);
router.delete('/books/:id', auth, requireRoles(['ADMIN', 'TEACHER', 'STUDENT']), softDeleteBook);

// Bibliothèque v2: ressources + dictionnaire + favoris + recherche (sans modifier le menu principal).
router.get('/v2/resources', auth, listResources);
router.get('/v2/resources/:id', auth, getResource);
router.post('/v2/resources', auth, requireRoles(['ADMIN', 'TEACHER', 'SUPER_ADMIN']), uploadLibraryResource, validate(createLibraryResourceSchema), createResource);
router.patch('/v2/resources/:id', auth, requireRoles(['ADMIN', 'TEACHER', 'SUPER_ADMIN']), uploadLibraryResource, validate(updateLibraryResourceSchema), updateResource);
router.delete('/v2/resources/:id', auth, requireRoles(['ADMIN', 'TEACHER', 'SUPER_ADMIN']), deleteResource);

router.get('/v2/dictionary', auth, listDictionaryTerms);
router.get('/v2/dictionary/suggest', auth, suggestDictionaryTerms);
router.get('/v2/dictionary/:id', auth, getDictionaryTerm);
router.post('/v2/dictionary', auth, requireRoles(['ADMIN']), validate(createDictionaryTermSchema), createDictionaryTerm);

router.get('/v2/favorites', auth, listFavorites);
router.post('/v2/favorites', auth, validate(addFavoriteSchema), addFavorite);
router.delete('/v2/favorites/:id', auth, removeFavorite);

router.get('/v2/search', auth, librarySearch);
router.post('/v2/reindex', auth, requireRoles(['ADMIN']), reindexLibrary);

module.exports = router;
