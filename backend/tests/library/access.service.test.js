const { isConfiguredSuperAdmin } = require('../../src/services/access');

describe('isConfiguredSuperAdmin', () => {
  const original = process.env.SUPER_ADMIN_EMAIL;

  beforeEach(() => {
    process.env.SUPER_ADMIN_EMAIL = 'infolinkedupro@gmail.com';
  });

  afterAll(() => {
    process.env.SUPER_ADMIN_EMAIL = original;
  });

  test('returns true for configured admin email', () => {
    expect(isConfiguredSuperAdmin({ role: 'ADMIN', email: 'infolinkedupro@gmail.com' })).toBe(true);
  });

  test('returns false for teacher or different email', () => {
    expect(isConfiguredSuperAdmin({ role: 'TEACHER', email: 'infolinkedupro@gmail.com' })).toBe(false);
    expect(isConfiguredSuperAdmin({ role: 'ADMIN', email: 'x@y.com' })).toBe(false);
  });
});
