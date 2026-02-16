jest.mock('../../src/config/prisma', () => ({
  blogPost: {
    count: jest.fn()
  }
}));

jest.mock('../../src/community/services/config.service', () => ({
  getCommunityConfig: jest.fn()
}));

const prisma = require('../../src/config/prisma');
const { getCommunityConfig } = require('../../src/community/services/config.service');
const { enforcePostLimit } = require('../../src/community/middlewares/post-limit');

describe('enforcePostLimit', () => {
  test('blocks when daily limit reached', async () => {
    getCommunityConfig.mockResolvedValue({ maxPostsPerDay: 3, maxPostsPerMonth: 10 });
    prisma.blogPost.count.mockResolvedValueOnce(3).mockResolvedValueOnce(5);

    const req = { user: { id: 1, role: 'STUDENT' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await enforcePostLimit(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(next).not.toHaveBeenCalled();
  });

  test('passes when under limits', async () => {
    getCommunityConfig.mockResolvedValue({ maxPostsPerDay: 3, maxPostsPerMonth: 10 });
    prisma.blogPost.count.mockResolvedValueOnce(1).mockResolvedValueOnce(4);

    const req = { user: { id: 1, role: 'STUDENT' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    await enforcePostLimit(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
