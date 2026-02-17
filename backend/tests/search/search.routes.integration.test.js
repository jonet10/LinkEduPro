const request = require('supertest');
const express = require('express');

const mockPrisma = {
  subject: {
    findMany: jest.fn(),
    count: jest.fn()
  },
  blogPost: {
    findMany: jest.fn(),
    count: jest.fn()
  },
  student: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn()
  },
  searchHistory: {
    findMany: jest.fn(),
    groupBy: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn()
  },
  $transaction: jest.fn(async (cb) => cb(mockPrisma))
};

jest.mock('../../src/config/prisma', () => mockPrisma);

const searchRoutes = require('../../src/search/routes/search.routes');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/search', searchRoutes);
  app.use((error, _req, res, _next) => {
    res.status(500).json({ message: error.message || 'server error' });
  });
  return app;
}

describe('search routes integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma.subject.findMany.mockResolvedValue([]);
    mockPrisma.subject.count.mockResolvedValue(0);
    mockPrisma.blogPost.findMany.mockResolvedValue([]);
    mockPrisma.blogPost.count.mockResolvedValue(0);
    mockPrisma.student.findMany.mockResolvedValue([]);
    mockPrisma.student.count.mockResolvedValue(0);
    mockPrisma.searchHistory.findMany.mockResolvedValue([]);
    mockPrisma.searchHistory.groupBy.mockResolvedValue([]);
  });

  test('GET /search/advanced rejects missing query', async () => {
    const app = createApp();
    const res = await request(app).get('/search/advanced');

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Validation error');
  });

  test('GET /search/advanced returns categorized results with totals and pagination', async () => {
    mockPrisma.subject.findMany.mockResolvedValue([
      {
        id: 1,
        name: 'Physique NS4',
        description: 'Cours complet',
        createdAt: new Date('2026-02-01T10:00:00.000Z'),
        _count: { attempts: 12 },
        courseTags: [{ tag: { name: 'physique' } }]
      }
    ]);
    mockPrisma.subject.count.mockResolvedValue(1);

    mockPrisma.blogPost.findMany.mockResolvedValue([
      {
        id: 10,
        title: 'Revision Physique 2026',
        excerpt: 'Résumé de publication',
        content: 'Contenu publication',
        likeCount: 9,
        createdAt: new Date('2026-02-03T08:00:00.000Z'),
        author: { id: 7, firstName: 'Marie', lastName: 'Paul' },
        publicationTags: [{ tag: { name: 'revision' } }]
      }
    ]);
    mockPrisma.blogPost.count.mockResolvedValue(1);

    mockPrisma.student.findMany.mockResolvedValue([
      {
        id: 4,
        firstName: 'Jean',
        lastName: 'Louis',
        school: 'Link School',
        teacherLevel: 'VERIFIED',
        reputationScore: 48,
        photoUrl: null,
        createdAt: new Date('2026-01-25T09:00:00.000Z')
      }
    ]);
    mockPrisma.student.count.mockResolvedValue(1);

    const app = createApp();
    const res = await request(app)
      .get('/search/advanced')
      .query({ q: 'physique', category: 'all', page: 1, limit: 10, date: 'newest', popularity: 'most_viewed' });

    expect(res.status).toBe(200);
    expect(res.body.results.courses).toHaveLength(1);
    expect(res.body.results.publications).toHaveLength(1);
    expect(res.body.results.teachers).toHaveLength(1);
    expect(res.body.results.events).toEqual([]);
    expect(res.body.totals).toMatchObject({ courses: 1, publications: 1, teachers: 1, events: 0, all: 3 });
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 10 });
  });

  test('GET /search/suggestions returns up to 5 grouped suggestions with highlights', async () => {
    mockPrisma.subject.findMany.mockResolvedValue(
      Array.from({ length: 6 }).map((_, idx) => ({
        id: idx + 1,
        name: `Math ${idx + 1}`,
        description: 'desc',
        courseTags: []
      }))
    );

    mockPrisma.blogPost.findMany.mockResolvedValue([
      { id: 11, title: 'Math Focus', excerpt: 'x', publicationTags: [] }
    ]);

    mockPrisma.student.findMany.mockResolvedValue([
      { id: 5, firstName: 'Mathieu', lastName: 'Pierre', school: 'LEP' }
    ]);

    const app = createApp();
    const res = await request(app)
      .get('/search/suggestions')
      .query({ q: 'math', category: 'all' });

    expect(res.status).toBe(200);
    expect(res.body.courses.length).toBeLessThanOrEqual(5);
    expect(res.body.publications.length).toBeLessThanOrEqual(5);
    expect(res.body.teachers.length).toBeLessThanOrEqual(5);
    expect(res.body.courses[0].highlighted).toContain('<mark>Math</mark>');
  });

  test('GET /search/advanced category filter publications avoids course/teacher db calls', async () => {
    mockPrisma.blogPost.findMany.mockResolvedValue([]);
    mockPrisma.blogPost.count.mockResolvedValue(0);

    const app = createApp();
    const res = await request(app)
      .get('/search/advanced')
      .query({ q: 'test', category: 'publications' });

    expect(res.status).toBe(200);
    expect(mockPrisma.subject.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.student.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.blogPost.findMany).toHaveBeenCalled();
  });
});
