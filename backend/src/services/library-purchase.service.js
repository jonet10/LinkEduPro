const prisma = require('../config/prisma');
const { createMoncashPayment, buildLibraryOrderReference, parseLibraryOrderReference } = require('./moncash.service');

const LIBRARY_COMMISSION_RATE_RAW = Number(process.env.LIBRARY_COMMISSION_RATE ?? '0.10');
const LIBRARY_COMMISSION_RATE = Number.isFinite(LIBRARY_COMMISSION_RATE_RAW)
  ? Math.min(Math.max(LIBRARY_COMMISSION_RATE_RAW, 0), 0.95)
  : 0.10;

function round2(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

async function createLibraryCheckout({ buyer, bookId, paymentMethod = 'MONCASH' }) {
  const targetBookId = Number(bookId);
  if (!Number.isInteger(targetBookId) || targetBookId <= 0) {
    return { ok: false, status: 400, message: 'Livre invalide.' };
  }

  const book = await prisma.libraryBook.findFirst({
    where: {
      id: targetBookId,
      isDeleted: false,
      status: 'APPROVED'
    },
    select: { id: true, isPaid: true, price: true, uploadedBy: true, title: true }
  });
  if (!book) return { ok: false, status: 404, message: 'Livre introuvable.' };

  if (!book.isPaid || Number(book.price || 0) <= 0) {
    return { ok: true, message: 'Livre gratuit.', free: true, canAccess: true };
  }

  const existing = await prisma.libraryPurchase.findUnique({
    where: { bookId_buyerId: { bookId: book.id, buyerId: buyer.id } },
    select: { id: true, status: true }
  });
  if (existing?.status === 'PAID') {
    return { ok: true, message: 'Livre déjà acheté.', alreadyPaid: true, canAccess: true };
  }

  if (paymentMethod !== 'MONCASH') {
    return { ok: false, status: 400, message: 'Mode de paiement non supporté pour cet achat.' };
  }

  const amount = Number(book.price || 0);
  const orderRef = buildLibraryOrderReference({ bookId: book.id, buyerId: buyer.id });
  const payment = await createMoncashPayment({ amount, orderId: orderRef });

  await prisma.libraryPurchase.upsert({
    where: { bookId_buyerId: { bookId: book.id, buyerId: buyer.id } },
    create: {
      bookId: book.id,
      buyerId: buyer.id,
      amount,
      currency: 'HTG',
      status: 'PENDING',
      paymentMethod: 'MONCASH',
      orderRef
    },
    update: {
      amount,
      currency: 'HTG',
      status: 'PENDING',
      paymentMethod: 'MONCASH',
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

async function confirmLibraryPurchaseByReference({ orderRef, providerTxId, amount }) {
  const parsed = parseLibraryOrderReference(orderRef);
  if (!parsed) return { ok: false, status: 400, message: 'Référence achat livre invalide.' };

  const purchase = await prisma.libraryPurchase.findUnique({
    where: { bookId_buyerId: { bookId: parsed.bookId, buyerId: parsed.buyerId } }
  });
  if (!purchase) return { ok: false, status: 404, message: 'Achat introuvable.' };
  if (purchase.status === 'PAID') return { ok: true, alreadyPaid: true };

  const amountValue = Number.isFinite(Number(amount)) && Number(amount) > 0
    ? Number(amount)
    : Number(purchase.amount || 0);
  const platformCommission = round2(amountValue * LIBRARY_COMMISSION_RATE);
  const sellerAmount = round2(amountValue - platformCommission);

  await prisma.libraryPurchase.update({
    where: { id: purchase.id },
    data: {
      status: 'PAID',
      providerTxId: providerTxId || purchase.providerTxId,
      paidAt: new Date(),
      amount: amountValue,
      platformCommission,
      sellerAmount
    }
  });

  return { ok: true, bookId: parsed.bookId, buyerId: parsed.buyerId };
}

module.exports = {
  LIBRARY_COMMISSION_RATE,
  createLibraryCheckout,
  confirmLibraryPurchaseByReference
};
