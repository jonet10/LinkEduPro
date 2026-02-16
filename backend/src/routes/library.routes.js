const express = require('express');
const auth = require('../middlewares/auth');
const { listBooks } = require('../controllers/library.controller');

const router = express.Router();

router.get('/books', auth, listBooks);

module.exports = router;
