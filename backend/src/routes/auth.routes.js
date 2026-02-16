const express = require('express');
const { register, login, acceptTeacherInvite, validateTeacherInvite } = require('../controllers/auth.controller');
const validate = require('../middlewares/validate');
const { registerSchema, loginSchema, acceptTeacherInviteSchema } = require('../services/validators');

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/teacher/invite/:token', validateTeacherInvite);
router.post('/teacher/accept-invite', validate(acceptTeacherInviteSchema), acceptTeacherInvite);

module.exports = router;
