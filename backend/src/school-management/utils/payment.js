function computePaymentStatus(amountDue, amountPaid) {
  if (amountPaid <= 0) return 'PENDING';
  if (amountPaid >= amountDue) return 'PAID';
  return 'PARTIAL';
}

module.exports = { computePaymentStatus };
