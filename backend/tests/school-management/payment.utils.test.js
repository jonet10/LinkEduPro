const { computePaymentStatus } = require('../../src/school-management/utils/payment');

describe('computePaymentStatus', () => {
  test('returns PENDING when amountPaid is zero', () => {
    expect(computePaymentStatus(100, 0)).toBe('PENDING');
  });

  test('returns PARTIAL when amountPaid is below amountDue', () => {
    expect(computePaymentStatus(100, 50)).toBe('PARTIAL');
  });

  test('returns PAID when amountPaid covers amountDue', () => {
    expect(computePaymentStatus(100, 100)).toBe('PAID');
    expect(computePaymentStatus(100, 120)).toBe('PAID');
  });
});
