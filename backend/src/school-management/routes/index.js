const express = require('express');
const validate = require('../../middlewares/validate');
const schoolAuth = require('../middlewares/school-auth');
const requireSchoolRoles = require('../middlewares/school-rbac');
const { login, changePassword } = require('../controllers/auth.controller');
const { schoolLoginSchema, schoolChangePasswordSchema } = require('../validators/school.validators');

const router = express.Router();

router.post('/login', validate(schoolLoginSchema), login);
router.post('/change-password', schoolAuth, validate(schoolChangePasswordSchema), changePassword);
router.get('/me', schoolAuth, (req, res) => res.json({ user: req.schoolUser }));

router.use(schoolAuth);
router.use((req, res, next) => {
  if (req.schoolUser.mustChangePassword) {
    return res.status(403).json({
      message: 'Changement de mot de passe obligatoire avant toute operation.'
    });
  }
  return next();
});

router.use((req, res, next) => {
  const user = req.schoolUser;
  if (user.role === 'SUPER_ADMIN') return next();
  if (user.schoolActive) return next();

  // Suspended schools can still access dashboard to see suspension notice.
  if (req.path.startsWith('/dashboard')) return next();

  return res.status(403).json({
    message: 'Compte ecole desactive. Contacte le responsable de la plateforme.'
  });
});
router.use('/schools', require('./schools.routes'));
router.use('/classes', require('./classes.routes'));
router.use('/students', require('./students.routes'));
router.use('/payments', require('./payments.routes'));
router.use('/dashboard', require('./dashboard.routes'));

module.exports = router;
