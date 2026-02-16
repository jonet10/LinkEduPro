const { requireTeacherOrAdmin } = require('../../src/community/middlewares/roles');

describe('requireTeacherOrAdmin', () => {
  test('allows teacher', () => {
    const req = { user: { role: 'TEACHER' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireTeacherOrAdmin(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  test('blocks student', () => {
    const req = { user: { role: 'STUDENT' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    requireTeacherOrAdmin(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
