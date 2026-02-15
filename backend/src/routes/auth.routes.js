const express = require('express');
const { register, login } = require('../controllers/auth.controller');
const validate = require('../middlewares/validate');
const { registerSchema, loginSchema } = require('../services/validators');

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

module.exports = router;
