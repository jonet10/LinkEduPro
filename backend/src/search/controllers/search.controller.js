const prisma = require('../../config/prisma');
const { normalizeTags, popularityEnabled, scoreResult, extractHighlighted } = require('../utils/search.utils');

function shouldSearch(requested, target) {
  return requested === 'all' || requested === target;
}

function tagWhereClause(tags) {
  if (!tags.length) return undefined;
  return {
    OR: tags.map((tagName) => ({
      tag: {
        name: {
          equals: tagName,
          mode: 'insensitive'
        }
      }
    }))
  };
}

function courseOrderBy({ date, popularity }) {
  if (popularity) {
    return [{ attempts: { _count: 'desc' } }, { createdAt: date === 'oldest' ? 'asc' : 'desc' }];
  }
  return [{ createdAt: date === 'oldest' ? 'asc' : 'desc' }];
}

function publicationOrderBy({ date, popularity }) {
  if (popularity) {
    return [{ likeCount: 'desc' }, { createdAt: date === 'oldest' ? 'asc' : 'desc' }];
  }
  return [{ createdAt: date === 'oldest' ? 'asc' : 'desc' }];
}

function teacherOrderBy({ date, popularity }) {
  if (popularity) {
    return [{ reputationScore: 'desc' }, { createdAt: date === 'oldest' ? 'asc' : 'desc' }];
  }
  return [{ createdAt: date === 'oldest' ? 'asc' : 'desc' }];
}

async function persistSearchHistory(userId, query) {
  await prisma.$transaction(async (tx) => {
    await tx.searchHistory.deleteMany({
      where: { userId, query }
    });

    await tx.searchHistory.create({
      data: { userId, query }
    });

    const older = await tx.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: 5,
      select: { id: true }
    });

    if (older.length) {
      await tx.searchHistory.deleteMany({
        where: { id: { in: older.map((entry) => entry.id) } }
      });
    }
  });
}

async function advancedSearch(req, res, next) {
  try {
    const {
      q,
      category,
      date,
      popularity,
      page,
      limit,
      author
    } = req.query;

    const tags = normalizeTags(req.query.tags);
    const usePopularity = popularityEnabled(popularity);
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const queryByCategory = {
      courses: shouldSearch(category, 'courses'),
      publications: shouldSearch(category, 'publications'),
      teachers: shouldSearch(category, 'teachers'),
      events: shouldSearch(category, 'events')
    };

    const courseWhere = {
      AND: [
        {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } }
          ]
        },
        ...(tags.length ? [{ courseTags: { some: tagWhereClause(tags) } }] : [])
      ]
    };

    const publicationWhere = {
      isApproved: true,
      isDeleted: false,
      AND: [
        {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
            { excerpt: { contains: q, mode: 'insensitive' } }
          ]
        },
        ...(author ? [{ author: { OR: [
          { firstName: { contains: author, mode: 'insensitive' } },
          { lastName: { contains: author, mode: 'insensitive' } },
          { email: { contains: author, mode: 'insensitive' } }
        ] } }] : []),
        ...(tags.length ? [{ publicationTags: { some: tagWhereClause(tags) } }] : [])
      ]
    };

    const teacherWhere = {
      role: 'TEACHER',
      AND: [
        {
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
            { school: { contains: q, mode: 'insensitive' } }
          ]
        },
        ...(author ? [{
          OR: [
            { firstName: { contains: author, mode: 'insensitive' } },
            { lastName: { contains: author, mode: 'insensitive' } },
            { email: { contains: author, mode: 'insensitive' } }
          ]
        }] : [])
      ]
    };

    const [
      courses,
      coursesCount,
      publications,
      publicationsCount,
      teachers,
      teachersCount
    ] = await Promise.all([
      queryByCategory.courses
        ? prisma.subject.findMany({
            where: courseWhere,
            include: {
              _count: { select: { attempts: true } },
              courseTags: { include: { tag: true } }
            },
            orderBy: courseOrderBy({ date, popularity: usePopularity }),
            skip,
            take
          })
        : [],
      queryByCategory.courses ? prisma.subject.count({ where: courseWhere }) : 0,

      queryByCategory.publications
        ? prisma.blogPost.findMany({
            where: publicationWhere,
            include: {
              author: { select: { id: true, firstName: true, lastName: true } },
              publicationTags: { include: { tag: true } }
            },
            orderBy: publicationOrderBy({ date, popularity: usePopularity }),
            skip,
            take
          })
        : [],
      queryByCategory.publications ? prisma.blogPost.count({ where: publicationWhere }) : 0,

      queryByCategory.teachers
        ? prisma.student.findMany({
            where: teacherWhere,
            select: {
              id: true,
              firstName: true,
              lastName: true,
              school: true,
              teacherLevel: true,
              reputationScore: true,
              photoUrl: true,
              createdAt: true
            },
            orderBy: teacherOrderBy({ date, popularity: usePopularity }),
            skip,
            take
          })
        : [],
      queryByCategory.teachers ? prisma.student.count({ where: teacherWhere }) : 0
    ]);

    const mappedCourses = courses
      .map((course) => {
        const tagsList = course.courseTags.map((item) => item.tag.name);
        return {
          id: course.id,
          name: course.name,
          description: course.description,
          tags: tagsList,
          attemptCount: course._count.attempts,
          score: scoreResult({ query: q, title: course.name, content: course.description, tags: tagsList }),
          createdAt: course.createdAt
        };
      })
      .sort((a, b) => b.score - a.score || b.attemptCount - a.attemptCount);

    const mappedPublications = publications
      .map((publication) => {
        const tagsList = publication.publicationTags.map((item) => item.tag.name);
        return {
          id: publication.id,
          title: publication.title,
          excerpt: publication.excerpt,
          author: publication.author,
          likeCount: publication.likeCount,
          tags: tagsList,
          score: scoreResult({ query: q, title: publication.title, content: publication.content, tags: tagsList }),
          createdAt: publication.createdAt
        };
      })
      .sort((a, b) => b.score - a.score || b.likeCount - a.likeCount);

    const mappedTeachers = teachers.map((teacher) => ({
      id: teacher.id,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      school: teacher.school,
      teacherLevel: teacher.teacherLevel,
      reputationScore: teacher.reputationScore,
      photoUrl: teacher.photoUrl,
      createdAt: teacher.createdAt
    }));

    if (req.user?.id) {
      await persistSearchHistory(req.user.id, q);
    }

    return res.json({
      query: q,
      filters: {
        category,
        date,
        popularity: usePopularity,
        author: author || null,
        tags
      },
      pagination: {
        page: Number(page),
        limit: Number(limit)
      },
      totals: {
        courses: coursesCount,
        publications: publicationsCount,
        teachers: teachersCount,
        events: 0,
        all: coursesCount + publicationsCount + teachersCount
      },
      results: {
        courses: mappedCourses,
        publications: mappedPublications,
        teachers: mappedTeachers,
        events: []
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function getSuggestions(req, res, next) {
  try {
    const { q, category } = req.query;
    const tags = normalizeTags(req.query.tags);

    const [courses, publications, teachers] = await Promise.all([
      shouldSearch(category, 'courses')
        ? prisma.subject.findMany({
            where: {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } }
              ],
              ...(tags.length ? { courseTags: { some: tagWhereClause(tags) } } : {})
            },
            include: { courseTags: { include: { tag: true } } },
            orderBy: { createdAt: 'desc' },
            take: 5
          })
        : [],
      shouldSearch(category, 'publications')
        ? prisma.blogPost.findMany({
            where: {
              isApproved: true,
              isDeleted: false,
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { excerpt: { contains: q, mode: 'insensitive' } }
              ],
              ...(tags.length ? { publicationTags: { some: tagWhereClause(tags) } } : {})
            },
            include: { publicationTags: { include: { tag: true } } },
            orderBy: [{ likeCount: 'desc' }, { createdAt: 'desc' }],
            take: 5
          })
        : [],
      shouldSearch(category, 'teachers')
        ? prisma.student.findMany({
            where: {
              role: 'TEACHER',
              OR: [
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
                { school: { contains: q, mode: 'insensitive' } }
              ]
            },
            select: { id: true, firstName: true, lastName: true, school: true },
            orderBy: { reputationScore: 'desc' },
            take: 5
          })
        : []
    ]);

    return res.json({
      query: q,
      courses: courses.slice(0, 5).map((item) => ({
        id: item.id,
        label: item.name,
        highlighted: extractHighlighted(item.name, q),
        category: 'courses'
      })),
      publications: publications.slice(0, 5).map((item) => ({
        id: item.id,
        label: item.title,
        highlighted: extractHighlighted(item.title, q),
        category: 'publications'
      })),
      teachers: teachers.slice(0, 5).map((item) => ({
        id: item.id,
        label: `${item.firstName} ${item.lastName}`,
        highlighted: extractHighlighted(`${item.firstName} ${item.lastName}`, q),
        category: 'teachers'
      })),
      events: []
    });
  } catch (error) {
    return next(error);
  }
}

async function getSearchHistory(req, res, next) {
  try {
    const history = await prisma.searchHistory.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    return res.json({
      history: history.map((entry) => ({ id: entry.id, query: entry.query, createdAt: entry.createdAt }))
    });
  } catch (error) {
    return next(error);
  }
}

async function getTrendingSearches(_req, res, next) {
  try {
    const trending = await prisma.searchHistory.groupBy({
      by: ['query'],
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: 10
    });

    return res.json({
      trending: trending.map((entry) => ({ query: entry.query, count: entry._count.query }))
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  advancedSearch,
  getSuggestions,
  getSearchHistory,
  getTrendingSearches
};
