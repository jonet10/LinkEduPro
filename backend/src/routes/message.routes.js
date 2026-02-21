const express = require('express');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { requireRoles } = require('../middlewares/roles');
const {
  listMessageRecipients,
  sendPrivateMessage,
  listConversations,
  getConversationById,
  sendGlobalMessage
} = require('../controllers/message.controller');
const {
  privateMessageSchema,
  globalMessageSchema
} = require('../services/validators');

const router = express.Router();

router.use(auth);

router.get('/recipients', listMessageRecipients);
router.post('/private', validate(privateMessageSchema), sendPrivateMessage);
router.get('/conversations', listConversations);
router.get('/conversations/:id', getConversationById);
router.post('/global', requireRoles(['ADMIN']), validate(globalMessageSchema), sendGlobalMessage);

module.exports = router;
