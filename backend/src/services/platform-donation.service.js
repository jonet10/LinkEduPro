const prisma = require('../config/prisma');
const { createMoncashPayment, buildPlatformDonationOrderReference, parsePlatformDonationOrderReference } = require('./moncash.service');

async function ensureGuestDonor() {
  const guestEmail = 'guest-donor@linkedupro.local';
  return prisma.student.upsert({
    where: { email: guestEmail },
    update: {},
    create: {
      firstName: 'Donateur',
      lastName: 'Invité',
      sex: 'OTHER',
      dateOfBirth: new Date('2000-01-01'),
      school: 'LinkEduPro',
      gradeLevel: 'VISITOR',
      email: guestEmail,
      phone: null,
      passwordHash: 'guest_donation_account_disabled',
      role: 'STUDENT'
    }
  });
}

async function createPlatformDonationCheckout({ donor, amount, paymentMethod = 'MONCASH' }) {
  const numericAmount = Number(amount || 0);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return { ok: false, status: 400, message: 'Montant invalide.' };
  }
  if (paymentMethod !== 'MONCASH') {
    return { ok: false, status: 400, message: 'Seul MonCash est supporte actuellement.' };
  }

  const resolvedDonor = donor?.id ? donor : await ensureGuestDonor();
  const orderRef = buildPlatformDonationOrderReference({ donorId: resolvedDonor.id });
  const payment = await createMoncashPayment({ amount: numericAmount, orderId: orderRef });

  await prisma.platformDonation.create({
    data: {
      donorId: resolvedDonor.id,
      amount: numericAmount,
      currency: 'HTG',
      paymentMethod: 'MONCASH',
      status: 'PENDING',
      orderRef
    }
  });

  return {
    ok: true,
    redirectUrl: payment.redirectUrl,
    orderRef,
    provider: 'MONCASH'
  };
}

async function confirmPlatformDonationByReference({ orderRef, providerTxId, amount }) {
  const parsed = parsePlatformDonationOrderReference(orderRef);
  if (!parsed) {
    return { ok: false, status: 400, message: 'Reference don invalide.' };
  }

  const donation = await prisma.platformDonation.findFirst({
    where: { orderRef, donorId: parsed.donorId }
  });
  if (!donation) {
    return { ok: false, status: 404, message: 'Don introuvable.' };
  }
  if (donation.status === 'SUCCESS') {
    return { ok: true, alreadyPaid: true, donorId: donation.donorId };
  }

  const amountValue = Number.isFinite(Number(amount)) && Number(amount) > 0
    ? Number(amount)
    : Number(donation.amount || 0);

  const updated = await prisma.platformDonation.update({
    where: { id: donation.id },
    data: {
      status: 'SUCCESS',
      providerTxId: providerTxId || donation.providerTxId,
      paidAt: new Date(),
      amount: amountValue
    }
  });

  return {
    ok: true,
    donationId: updated.id,
    donorId: updated.donorId
  };
}

async function listMyPlatformDonations({ userId }) {
  const rows = await prisma.platformDonation.findMany({
    where: { donorId: userId },
    orderBy: { createdAt: 'desc' }
  });
  return rows.map((row) => ({
    id: row.id,
    amount: Number(row.amount || 0),
    currency: row.currency,
    paymentMethod: row.paymentMethod,
    status: row.status,
    orderRef: row.orderRef,
    paidAt: row.paidAt,
    createdAt: row.createdAt
  }));
}

async function getPlatformDonationSummary() {
  const [agg, donors] = await Promise.all([
    prisma.platformDonation.aggregate({
      where: { status: 'SUCCESS' },
      _sum: { amount: true },
      _count: { _all: true }
    }),
    prisma.platformDonation.groupBy({
      by: ['donorId'],
      where: { status: 'SUCCESS' }
    })
  ]);

  return {
    totalCollected: Number(agg._sum.amount || 0),
    totalDonations: Number(agg._count._all || 0),
    totalDonors: donors.length
  };
}

async function listAllPlatformDonations() {
  const rows = await prisma.platformDonation.findMany({
    include: {
      donor: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return rows.map((row) => ({
    id: row.id,
    donorId: row.donorId,
    donorName: `${String(row.donor?.firstName || '').trim()} ${String(row.donor?.lastName || '').trim()}`.trim() || 'Utilisateur',
    donorEmail: row.donor?.email || null,
    donorRole: row.donor?.role || null,
    amount: Number(row.amount || 0),
    currency: row.currency,
    paymentMethod: row.paymentMethod,
    status: row.status,
    orderRef: row.orderRef,
    providerTxId: row.providerTxId,
    paidAt: row.paidAt,
    createdAt: row.createdAt
  }));
}

module.exports = {
  createPlatformDonationCheckout,
  confirmPlatformDonationByReference,
  listMyPlatformDonations,
  getPlatformDonationSummary,
  listAllPlatformDonations
};
