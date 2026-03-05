const express = require('express');
const auth = require('../middlewares/auth');
const optionalAuth = require('../middlewares/auth-optional');
const validate = require('../middlewares/validate');
const { requireRoles } = require('../middlewares/roles');
const Joi = require('joi');
const {
  createPlatformDonationCheckout,
  listMyPlatformDonations,
  getPlatformDonationSummary,
  listAllPlatformDonations
} = require('../services/platform-donation.service');

const router = express.Router();

const createCheckoutSchema = Joi.object({
  amount: Joi.number().positive().max(500000).required(),
  paymentMethod: Joi.string().valid('MONCASH').default('MONCASH')
});

router.get('/summary', async (req, res, next) => {
  try {
    const summary = await getPlatformDonationSummary();
    return res.json(summary);
  } catch (error) {
    return next(error);
  }
});

router.get('/mine', auth, async (req, res, next) => {
  try {
    const donations = await listMyPlatformDonations({ userId: req.user.id });
    return res.json({ donations });
  } catch (error) {
    return next(error);
  }
});

router.get('/admin/all', auth, requireRoles(['ADMIN']), async (req, res, next) => {
  try {
    const donations = await listAllPlatformDonations();
    return res.json({ donations });
  } catch (error) {
    return next(error);
  }
});

router.post('/checkout', optionalAuth, validate(createCheckoutSchema), async (req, res, next) => {
  try {
    const result = await createPlatformDonationCheckout({
      donor: req.user || null,
      amount: req.body.amount,
      paymentMethod: req.body.paymentMethod
    });
    if (!result.ok) {
      return res.status(result.status || 400).json({ message: result.message });
    }
    return res.status(202).json({
      message: 'Redirection MonCash requise.',
      provider: result.provider,
      redirectUrl: result.redirectUrl,
      orderRef: result.orderRef
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
