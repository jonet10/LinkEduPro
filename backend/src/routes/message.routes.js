const express = require('express');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { requireRoles } = require('../middlewares/roles');
const {
  listMessageRecipients,
  getUnreadMessageSummary,
  sendPrivateMessage,
  listConversations,
  getConversationById,
  sendGlobalMessage,
  deleteConversation,
  deleteMessage
} = require('../controllers/message.controller');
const {
  privateMessageSchema,
  globalMessageSchema
} = require('../services/validators');

const router = express.Router();

router.use(auth);

router.get('/recipients', listMessageRecipients);
router.get('/unread-summary', getUnreadMessageSummary);
router.post('/private', validate(privateMessageSchema), sendPrivateMessage);
router.get('/conversations', listConversations);
router.get('/conversations/:id', getConversationById);
router.delete('/conversations/:id', deleteConversation);
router.delete('/:messageId', deleteMessage);
router.post('/global', requireRoles(['ADMIN']), validate(globalMessageSchema), sendGlobalMessage);

module.exports = router;
