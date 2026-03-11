const prisma = require('../../config/prisma');
const { normalizeTags, popularityEnabled, scoreResult, extractHighlighted } = require('../utils/search.utils');

function shouldSearch(requested, target) {
  return requested === 'all' || requested === target;
}

function mapAcademicToEducationLevel(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return null;
  if (raw === 'LEVEL_9E' || raw === '9E') return 'LEVEL_9E';
  if (raw === 'NSI') return 'NS1';
  if (raw === 'NSII') return 'NS2';
  if (raw === 'NSIII') return 'NS3';
  if (raw === 'NSIV' || raw === 'TERMINALE') return 'TERMINALE';
  if (raw === 'UNIVERSITAIRE' || raw === 'UNIVERSITE') return 'UNIVERSITE';
  return null;
}

async function resolveUserAcademicLevel(userId) {
  if (!userId) return null;
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: Number(userId) },
    select: { level: true }
  });
  return profile?.level || null;
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

function bookOrderBy({ date, popularity }) {
  if (popularity) {
    return [{ purchases: { _count: 'desc' } }, { createdAt: date === 'oldest' ? 'asc' : 'desc' }];
  }
  return [{ createdAt: date === 'oldest' ? 'asc' : 'desc' }];
}

function examOrderBy({ date }) {
  return [{ created_at: date === 'oldest' ? 'asc' : 'desc' }];
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

    const userAcademicLevel = req.user?.id ? await resolveUserAcademicLevel(req.user.id) : null;
    const userEducationLevel = mapAcademicToEducationLevel(userAcademicLevel);

    const queryByCategory = {
      courses: shouldSearch(category, 'courses') || shouldSearch(category, 'quizzes'),
      quizzes: shouldSearch(category, 'courses') || shouldSearch(category, 'quizzes'),
      publications: shouldSearch(category, 'publications'),
      teachers: shouldSearch(category, 'teachers'),
      books: shouldSearch(category, 'books'),
      videos: shouldSearch(category, 'videos'),
      exams: shouldSearch(category, 'exams'),
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

    const bookWhere = {
      isDeleted: false,
      status: 'APPROVED',
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { author: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } }
      ]
    };

    const videoWhere = {
      type: 'VIDEO',
      status: 'APPROVED',
      AND: [
        {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { body: { contains: q, mode: 'insensitive' } }
          ]
        },
        ...(userEducationLevel ? [{
          OR: [
            { level: userEducationLevel },
            { targetLevels: { has: userEducationLevel } }
          ]
        }] : [])
      ]
    };

    const examWhere = {
      ...(userAcademicLevel ? { level: userAcademicLevel } : {}),
      OR: [
        { subject: { contains: q, mode: 'insensitive' } },
        { topic: { contains: q, mode: 'insensitive' } },
        { file_name: { contains: q, mode: 'insensitive' } }
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
      teachersCount,
      books,
      booksCount,
      videos,
      videosCount,
      exams,
      examsCount
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
      queryByCategory.teachers ? prisma.student.count({ where: teacherWhere }) : 0,

      queryByCategory.books
        ? prisma.libraryBook.findMany({
            where: bookWhere,
            include: { _count: { select: { purchases: true } } },
            orderBy: bookOrderBy({ date, popularity: usePopularity }),
            skip,
            take
          })
        : [],
      queryByCategory.books ? prisma.libraryBook.count({ where: bookWhere }) : 0,

      queryByCategory.videos
        ? prisma.content.findMany({
            where: videoWhere,
            orderBy: [{ createdAt: date === 'oldest' ? 'asc' : 'desc' }],
            skip,
            take
          })
        : [],
      queryByCategory.videos ? prisma.content.count({ where: videoWhere }) : 0,

      queryByCategory.exams
        ? prisma.probable_exercise_sources.findMany({
            where: examWhere,
            orderBy: examOrderBy({ date }),
            skip,
            take
          })
        : [],
      queryByCategory.exams ? prisma.probable_exercise_sources.count({ where: examWhere }) : 0
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

    const mappedBooks = books
      .map((book) => ({
        id: book.id,
        title: book.title,
        author: book.author,
        subject: book.subject,
        level: book.level,
        description: book.description,
        coverImageUrl: book.coverImageUrl,
        fileUrl: book.fileUrl,
        purchasesCount: book._count?.purchases || 0,
        score: scoreResult({
          query: q,
          title: book.title,
          content: [book.author, book.subject, book.description].filter(Boolean).join(' '),
          tags: [book.subject, book.level].filter(Boolean)
        }),
        createdAt: book.createdAt
      }))
      .sort((a, b) => b.score - a.score || b.purchasesCount - a.purchasesCount);

    const mappedVideos = videos
      .map((content) => ({
        id: content.id,
        title: content.title,
        excerpt: String(content.body || '').slice(0, 220),
        level: content.level,
        type: content.type,
        score: scoreResult({ query: q, title: content.title, content: content.body }),
        createdAt: content.createdAt
      }))
      .sort((a, b) => b.score - a.score);

    const mappedExams = exams
      .map((row) => {
        const fileName = String(row.file_name || '').trim();
        return {
          id: row.id,
          level: row.level,
          subject: row.subject,
          topic: row.topic,
          fileName,
          score: scoreResult({
            query: q,
            title: `${row.subject} - ${row.topic}`,
            content: fileName
          }),
          createdAt: row.created_at
        };
      })
      .sort((a, b) => b.score - a.score);

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
        quizzes: coursesCount,
        publications: publicationsCount,
        teachers: teachersCount,
        books: booksCount,
        videos: videosCount,
        exams: examsCount,
        events: 0,
        all: coursesCount + publicationsCount + teachersCount + booksCount + videosCount + examsCount
      },
      results: {
        courses: mappedCourses,
        quizzes: mappedCourses,
        publications: mappedPublications,
        teachers: mappedTeachers,
        books: mappedBooks,
        videos: mappedVideos,
        exams: mappedExams,
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

    const userAcademicLevel = req.user?.id ? await resolveUserAcademicLevel(req.user.id) : null;
    const userEducationLevel = mapAcademicToEducationLevel(userAcademicLevel);

    const [courses, publications, teachers, books, videos, exams] = await Promise.all([
      (shouldSearch(category, 'courses') || shouldSearch(category, 'quizzes'))
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
        : [],
      shouldSearch(category, 'books')
        ? prisma.libraryBook.findMany({
            where: {
              isDeleted: false,
              status: 'APPROVED',
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { author: { contains: q, mode: 'insensitive' } },
                { subject: { contains: q, mode: 'insensitive' } }
              ]
            },
            select: { id: true, title: true },
            orderBy: { createdAt: 'desc' },
            take: 5
          })
        : [],
      shouldSearch(category, 'videos')
        ? prisma.content.findMany({
            where: {
              type: 'VIDEO',
              status: 'APPROVED',
              AND: [
                {
                  OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { body: { contains: q, mode: 'insensitive' } }
                  ]
                },
                ...(userEducationLevel ? [{
                  OR: [
                    { level: userEducationLevel },
                    { targetLevels: { has: userEducationLevel } }
                  ]
                }] : [])
              ]
            },
            select: { id: true, title: true },
            orderBy: { createdAt: 'desc' },
            take: 5
          })
        : [],
      shouldSearch(category, 'exams')
        ? prisma.probable_exercise_sources.findMany({
            where: {
              ...(userAcademicLevel ? { level: userAcademicLevel } : {}),
              OR: [
                { subject: { contains: q, mode: 'insensitive' } },
                { topic: { contains: q, mode: 'insensitive' } },
                { file_name: { contains: q, mode: 'insensitive' } }
              ]
            },
            select: { id: true, subject: true, topic: true },
            orderBy: { created_at: 'desc' },
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
      quizzes: courses.slice(0, 5).map((item) => ({
        id: item.id,
        label: item.name,
        highlighted: extractHighlighted(item.name, q),
        category: 'quizzes'
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
      books: books.slice(0, 5).map((item) => ({
        id: item.id,
        label: item.title,
        highlighted: extractHighlighted(item.title, q),
        category: 'books'
      })),
      videos: videos.slice(0, 5).map((item) => ({
        id: item.id,
        label: item.title,
        highlighted: extractHighlighted(item.title, q),
        category: 'videos'
      })),
      exams: exams.slice(0, 5).map((item) => ({
        id: item.id,
        label: `${item.subject}${item.topic ? ` — ${item.topic}` : ''}`,
        highlighted: extractHighlighted(`${item.subject}${item.topic ? ` — ${item.topic}` : ''}`, q),
        category: 'exams'
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
