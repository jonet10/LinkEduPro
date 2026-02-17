const { normalizeTags, popularityEnabled, scoreResult, extractHighlighted } = require('../../src/search/utils/search.utils');

describe('search.utils', () => {
  test('normalizeTags should trim, deduplicate and lowercase', () => {
    const tags = normalizeTags([' Math ', 'Science,math', '']);
    expect(tags).toEqual(['math', 'science']);
  });

  test('popularityEnabled should parse truthy values', () => {
    expect(popularityEnabled('1')).toBe(true);
    expect(popularityEnabled('true')).toBe(true);
    expect(popularityEnabled('most_viewed')).toBe(true);
    expect(popularityEnabled('0')).toBe(false);
  });

  test('scoreResult should prioritize title then tags then content', () => {
    const titleOnly = scoreResult({ query: 'bio', title: 'Biologie', content: 'x', tags: [] });
    const contentOnly = scoreResult({ query: 'bio', title: 'x', content: 'biologie', tags: [] });
    expect(titleOnly).toBeGreaterThan(contentOnly);
  });

  test('extractHighlighted should wrap matches with mark', () => {
    const value = extractHighlighted('Cours de Physique', 'phys');
    expect(value).toContain('<mark>Phys</mark>');
  });
});
