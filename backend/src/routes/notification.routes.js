const express = require('express');
const auth = require('../middlewares/auth');
const {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead
} = require('../controllers/notification.controller');

const router = express.Router();

router.get('/', auth, listNotifications);
router.patch('/:id/read', auth, markNotificationRead);
router.patch('/read-all', auth, markAllNotificationsRead);

module.exports = router;
