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

function topicKey(subject, topic) {
  return `${String(subject || '').trim().toLowerCase()}::${String(topic || '').trim().toLowerCase()}`;
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

    let likeRows = [];
    let commentCountRows = [];
    let commentRows = [];
    let myLikeRows = [];

    // Social data is optional until migration is deployed.
    try {
      [likeRows, commentCountRows, commentRows, myLikeRows] = await Promise.all([
        prisma.$queryRaw(
          Prisma.sql`
            SELECT
              l.subject AS subject,
              l.topic AS topic,
              COUNT(*)::int AS likes
            FROM probable_exercise_likes l
            GROUP BY l.subject, l.topic
          `
        ),
        prisma.$queryRaw(
          Prisma.sql`
            SELECT
              c.subject AS subject,
              c.topic AS topic,
              COUNT(*)::int AS comments
            FROM probable_exercise_comments c
            WHERE c.is_deleted = FALSE
            GROUP BY c.subject, c.topic
          `
        ),
        prisma.$queryRaw(
          Prisma.sql`
            SELECT
              c.id AS id,
              c.subject AS subject,
              c.topic AS topic,
              c.content AS content,
              c.created_at AS "createdAt",
              s.id AS "authorId",
              s."firstName" AS "authorFirstName",
              s."lastName" AS "authorLastName"
            FROM probable_exercise_comments c
            INNER JOIN "Student" s ON s.id = c.user_id
            WHERE c.is_deleted = FALSE
            ORDER BY c.created_at DESC
          `
        ),
        req.user
          ? prisma.$queryRaw(
              Prisma.sql`
                SELECT l.subject AS subject, l.topic AS topic
                FROM probable_exercise_likes l
                WHERE l.user_id = ${req.user.id}
              `
            )
          : Promise.resolve([])
      ]);
    } catch (_) {
      likeRows = [];
      commentCountRows = [];
      commentRows = [];
      myLikeRows = [];
    }

    const likeMap = new Map();
    likeRows.forEach((row) => likeMap.set(topicKey(row.subject, row.topic), Number(row.likes)));

    const commentCountMap = new Map();
    commentCountRows.forEach((row) => commentCountMap.set(topicKey(row.subject, row.topic), Number(row.comments)));

    const commentsMap = new Map();
    for (const row of commentRows) {
      const key = topicKey(row.subject, row.topic);
      if (!commentsMap.has(key)) commentsMap.set(key, []);
      const list = commentsMap.get(key);
      if (list.length < 3) {
        list.push({
          id: row.id,
          content: row.content,
          createdAt: row.createdAt,
          author: {
            id: row.authorId,
            firstName: row.authorFirstName,
            lastName: row.authorLastName
          }
        });
      }
    }

    const myLikes = new Set(
      (myLikeRows || []).map((row) => topicKey(row.subject, row.topic))
    );

    const bySubject = new Map();
    for (const row of rows) {
      if (!bySubject.has(row.subject)) {
        bySubject.set(row.subject, []);
      }
      const key = topicKey(row.subject, row.topic);
      bySubject.get(row.subject).push({
        topic: row.topic,
        frequency: Number(row.frequency),
        classification: classifyFrequency(Number(row.frequency)),
        likes: likeMap.get(key) || 0,
        commentsCount: commentCountMap.get(key) || 0,
        comments: commentsMap.get(key) || [],
        likedByMe: myLikes.has(key)
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

async function toggleProbableExerciseLike(req, res, next) {
  try {
    const subject = String(req.body?.subject || '').trim();
    const topic = String(req.body?.topic || '').trim();
    if (!subject || !topic) {
      return res.status(400).json({ message: 'Sujet et topic requis.' });
    }

    const existing = await prisma.$queryRaw(
      Prisma.sql`
        SELECT id
        FROM probable_exercise_likes
        WHERE user_id = ${req.user.id}
          AND subject = ${subject}
          AND topic = ${topic}
        LIMIT 1
      `
    );

    let liked;
    if (existing.length > 0) {
      await prisma.$executeRaw(
        Prisma.sql`
          DELETE FROM probable_exercise_likes
          WHERE user_id = ${req.user.id}
            AND subject = ${subject}
            AND topic = ${topic}
        `
      );
      liked = false;
    } else {
      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO probable_exercise_likes (subject, topic, user_id)
          VALUES (${subject}, ${topic}, ${req.user.id})
        `
      );
      liked = true;
    }

    const countRows = await prisma.$queryRaw(
      Prisma.sql`
        SELECT COUNT(*)::int AS likes
        FROM probable_exercise_likes
        WHERE subject = ${subject}
          AND topic = ${topic}
      `
    );

    return res.json({
      liked,
      likes: Number(countRows[0]?.likes || 0)
    });
  } catch (error) {
    return next(error);
  }
}

async function addProbableExerciseComment(req, res, next) {
  try {
    const subject = String(req.body?.subject || '').trim();
    const topic = String(req.body?.topic || '').trim();
    const content = String(req.body?.content || '').trim();

    if (!subject || !topic || !content) {
      return res.status(400).json({ message: 'Sujet, topic et commentaire requis.' });
    }

    if (content.length < 2 || content.length > 600) {
      return res.status(400).json({ message: 'Commentaire invalide (2 a 600 caracteres).' });
    }

    const rows = await prisma.$queryRaw(
      Prisma.sql`
        INSERT INTO probable_exercise_comments (subject, topic, user_id, content)
        VALUES (${subject}, ${topic}, ${req.user.id}, ${content})
        RETURNING id, subject, topic, content, created_at AS "createdAt"
      `
    );

    const created = rows[0];
    return res.status(201).json({
      comment: {
        id: created.id,
        subject: created.subject,
        topic: created.topic,
        content: created.content,
        createdAt: created.createdAt,
        author: {
          id: req.user.id
        }
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listRecentBlogPosts,
  getPublicBlogPost,
  listProbableExercises,
  toggleProbableExerciseLike,
  addProbableExerciseComment
};

