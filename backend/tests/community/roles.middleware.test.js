const { requireSuperAdmin } = require('../../src/community/middlewares/roles');

describe('requireSuperAdmin', () => {
  const original = process.env.SUPER_ADMIN_EMAIL;

  beforeEach(() => {
    process.env.SUPER_ADMIN_EMAIL = 'infolinkedupro@gmail.com';
  });

  afterAll(() => {
    process.env.SUPER_ADMIN_EMAIL = original;
  });

  test('rejects non-admin role', () => {
    const req = { user: { role: 'STUDENT', email: 'infolinkedupro@gmail.com' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireSuperAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('accepts admin with matching email', () => {
    const req = { user: { role: 'ADMIN', email: 'infolinkedupro@gmail.com' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireSuperAdmin(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
