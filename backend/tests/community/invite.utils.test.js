const { generateInviteToken } = require('../../src/community/utils/invite');

describe('generateInviteToken', () => {
  test('returns 48-char hex token', () => {
    const token = generateInviteToken();
    expect(token).toMatch(/^[a-f0-9]{48}$/);
  });
});
