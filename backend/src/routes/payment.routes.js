const express = require('express');
const { paymentReturn, paymentWebhook } = require('../controllers/payment.controller');

const router = express.Router();

router.get('/return', paymentReturn);
router.post('/webhook', paymentWebhook);
router.get('/webhook', (req, res) => {
  res.json({ ok: true, message: 'Payment webhook endpoint ready.' });
});

module.exports = router;

