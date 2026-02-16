const enforceSchoolScope = require('../../src/school-management/middlewares/school-scope');

describe('enforceSchoolScope', () => {
  test('allows super admin', () => {
    const req = { schoolUser: { role: 'SUPER_ADMIN' }, params: { schoolId: '2' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    enforceSchoolScope((r) => r.params.schoolId)(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('blocks cross-school access', () => {
    const req = { schoolUser: { role: 'SCHOOL_ADMIN', schoolId: 3 }, params: { schoolId: '2' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    enforceSchoolScope((r) => r.params.schoolId)(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
