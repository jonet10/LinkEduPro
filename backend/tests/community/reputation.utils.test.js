const { getReputationLevel } = require('../../src/community/utils/reputation');

describe('getReputationLevel', () => {
  test('returns Nouveau for 0-50', () => {
    expect(getReputationLevel(0)).toBe('Nouveau');
    expect(getReputationLevel(50)).toBe('Nouveau');
  });

  test('returns Actif for 51-200', () => {
    expect(getReputationLevel(51)).toBe('Actif');
    expect(getReputationLevel(200)).toBe('Actif');
  });

  test('returns Contributeur for 201-499', () => {
    expect(getReputationLevel(201)).toBe('Contributeur');
    expect(getReputationLevel(499)).toBe('Contributeur');
  });

  test('returns Leader Educatif for 500+', () => {
    expect(getReputationLevel(500)).toBe('Leader Educatif');
  });
});
