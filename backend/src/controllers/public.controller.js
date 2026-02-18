const prisma = require('../config/prisma');
const { Prisma } = require('@prisma/client');

function getLimit(value, fallback = 6) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(12, Math.max(1, Math.trunc(parsed)));
}

async function listRecentBlogPosts(req, res, next) {
  try {
    const limit = getLimit(req.query.limit, 6);

    const posts = await prisma.blogPost.findMany({
      where: {
        isDeleted: false,
        isApproved: true,
        isGlobal: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        excerpt: true,
        imageUrl: true,
        createdAt: true,
        author: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    return res.json({ items: posts });
  } catch (error) {
    return next(error);
  }
}

function classifyFrequency(frequency) {
  if (frequency >= 10) return 'Tres frequent';
  if (frequency >= 5) return 'Frequent';
  return 'Occasionnel';
}

async function getPublicBlogPost(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    if (!Number.isFinite(postId) || postId <= 0) {
      return res.status(400).json({ message: 'Identifiant article invalide.' });
    }

    const post = await prisma.blogPost.findFirst({
      where: {
        id: postId,
        isDeleted: false,
        isApproved: true,
        isGlobal: true
      },
      select: {
        id: true,
        title: true,
        excerpt: true,
        imageUrl: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    });

    if (!post) {
      return res.status(404).json({ message: 'Article introuvable.' });
    }

    return res.json({ post });
  } catch (error) {
    return next(error);
  }
}

async function listProbableExercises(req, res, next) {
  try {
    const rows = await prisma.$queryRaw(
      Prisma.sql`
        SELECT
          e.subject AS subject,
          q.topic AS topic,
          COUNT(*)::int AS frequency
        FROM exam_questions q
        INNER JOIN exams e ON e.id = q.exam_id
        WHERE e.level = CAST('NSIV' AS "AcademicLevel")
        GROUP BY e.subject, q.topic
        ORDER BY e.subject ASC, frequency DESC, q.topic ASC
      `
    );

    const bySubject = new Map();
    for (const row of rows) {
      if (!bySubject.has(row.subject)) {
        bySubject.set(row.subject, []);
      }
      bySubject.get(row.subject).push({
        topic: row.topic,
        frequency: Number(row.frequency),
        classification: classifyFrequency(Number(row.frequency))
      });
    }

    const items = Array.from(bySubject.entries()).map(([subject, topics]) => ({
      subject,
      topics
    }));

    return res.json({
      level: 'NSIV',
      items
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listRecentBlogPosts,
  getPublicBlogPost,
  listProbableExercises
};

