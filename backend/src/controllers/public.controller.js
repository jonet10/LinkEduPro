const prisma = require('../config/prisma');
const { Prisma } = require('@prisma/client');
const path = require('path');
const fs = require('fs');
const { touchPresence, getOnlineStats } = require('../services/online-presence.service');

const DEFAULT_TIKTOK_CREATORS = [
  { title: 'Maths en 60 secondes', handle: '@mathsfacile.ht', category: 'Mathématiques', search: 'maths bac haiti' },
  { title: 'Chimie visuelle', handle: '@chimie.simple', category: 'Chimie', search: 'chimie exercices' },
  { title: 'Histoire-Géo active', handle: '@histgeo.smart', category: 'Histoire-Géo', search: 'histoire geographie revision' },
  { title: 'Philo en pratique', handle: '@philo.express', category: 'Philosophie', search: 'philosophie terminale' }
];

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
          COUNT(*)::int AS frequency,
          COALESCE(
            MAX(CASE WHEN q.question_text ILIKE '%.pdf' THEN NULL ELSE q.question_text END),
            MAX(q.question_text)
          ) AS sample_question
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
    let sourceRows = [];

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

    try {
      sourceRows = await prisma.$queryRaw(
        Prisma.sql`
          SELECT subject, topic, file_name AS "fileName"
          FROM probable_exercise_sources
        `
      );
    } catch (_) {
      sourceRows = [];
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
    const sourcesMap = new Map();
    for (const row of sourceRows) {
      const key = topicKey(row.subject, row.topic);
      if (!sourcesMap.has(key)) sourcesMap.set(key, []);
      sourcesMap.get(key).push({
        fileName: row.fileName,
        url: `/public/exam-pdfs/${encodeURIComponent(row.fileName)}`
      });
    }

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
        sampleQuestion: row.sample_question || null,
        likes: likeMap.get(key) || 0,
        commentsCount: commentCountMap.get(key) || 0,
        comments: commentsMap.get(key) || [],
        likedByMe: myLikes.has(key),
        sources: sourcesMap.get(key) || []
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

async function streamExamPdf(req, res, next) {
  try {
    const raw = String(req.params.fileName || '').trim();
    const fileName = decodeURIComponent(raw);
    const safeName = path.basename(fileName);
    if (!safeName || safeName !== fileName) {
      return res.status(400).json({ message: 'Nom de fichier invalide.' });
    }

    const candidateDirs = [
      path.resolve(__dirname, '../../../Examen Physiques'),
      path.resolve(__dirname, '../../../Documents/Chimie'),
      path.resolve(__dirname, '../../../Documents/Math'),
      path.resolve(__dirname, '../../../Documents/Mathematiques')
    ];

    const filePath = candidateDirs
      .map((dir) => path.join(dir, safeName))
      .find((candidate) => fs.existsSync(candidate));

    if (!filePath) {
      return res.status(404).json({ message: 'PDF introuvable.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    return fs.createReadStream(filePath).pipe(res);
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

async function pingOnlinePresence(req, res, next) {
  try {
    const pingInfo = touchPresence(req.user);
    return res.json({
      message: 'Presence mise a jour.',
      ping: pingInfo,
      stats: getOnlineStats(req.user?.id)
    });
  } catch (error) {
    return next(error);
  }
}

async function getOnlinePresenceStats(req, res, next) {
  try {
    return res.json(getOnlineStats(req.user?.id));
  } catch (error) {
    return next(error);
  }
}

function getIsoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function sanitizeTiktokCreators(raw) {
  if (!Array.isArray(raw)) return DEFAULT_TIKTOK_CREATORS;
  const items = raw
    .map((item) => ({
      title: String(item?.title || '').trim(),
      handle: String(item?.handle || '').trim(),
      category: String(item?.category || '').trim(),
      search: String(item?.search || '').trim()
    }))
    .filter((item) => item.title && item.handle && item.category && item.search)
    .slice(0, 12);

  return items.length ? items : DEFAULT_TIKTOK_CREATORS;
}

async function getHomeTikTokCreators(req, res, next) {
  try {
    const config = await prisma.communityConfig.findUnique({
      where: { id: 1 },
      select: {
        tiktokCreators: true,
        homeChallengeTitle: true,
        homeChallengeSubtitle: true,
        homeChallengeTheme: true
      }
    });

    const weekKey = getIsoWeekKey();
    const challengeTheme = String(config?.homeChallengeTheme || 'TIKTOKERS');
    const candidates = sanitizeTiktokCreators(config?.tiktokCreators || null);
    const handles = candidates.map((item) => item.handle);

    const voteRows = await prisma.homeChallengeVote.groupBy({
      by: ['candidateHandle'],
      where: {
        weekKey,
        challengeTheme,
        candidateHandle: { in: handles }
      },
      _count: { _all: true }
    });

    const voteMap = new Map(voteRows.map((row) => [row.candidateHandle, row._count._all]));
    const totalVotes = voteRows.reduce((sum, row) => sum + row._count._all, 0);
    const recentCommentsRows = await prisma.homeChallengeVote.findMany({
      where: {
        weekKey,
        challengeTheme,
        comment: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        candidateHandle: true,
        comment: true,
        createdAt: true,
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    });

    let myVote = null;
    if (req.user?.id) {
      const mine = await prisma.homeChallengeVote.findUnique({
        where: {
          userId_weekKey_challengeTheme: {
            userId: req.user.id,
            weekKey,
            challengeTheme
          }
        },
        select: { candidateHandle: true, comment: true, createdAt: true }
      });
      myVote = mine || null;
    }

    const items = candidates
      .map((item, index) => ({
        ...item,
        votes: Number(voteMap.get(item.handle) || 0),
        _order: index
      }))
      .sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        return a._order - b._order;
      })
      .map(({ _order, ...rest }) => rest);

    return res.json({
      title: config?.homeChallengeTitle || 'Vote de la semaine',
      subtitle: config?.homeChallengeSubtitle || 'Choisis la personne qui doit rester en tête cette semaine.',
      theme: challengeTheme,
      weekKey,
      totalVotes,
      myVote,
      recentComments: recentCommentsRows.map((row) => ({
        id: row.id,
        candidateHandle: row.candidateHandle,
        comment: row.comment,
        createdAt: row.createdAt,
        author: `${String(row.user?.firstName || '').trim()} ${String(row.user?.lastName || '').trim()}`.trim() || 'Utilisateur'
      })),
      items
    });
  } catch (error) {
    return next(error);
  }
}

async function submitHomeChallengeVote(req, res, next) {
  try {
    const handle = String(req.body?.handle || '').trim();
    const comment = String(req.body?.comment || '').trim();

    if (!handle) {
      return res.status(400).json({ message: 'Choisis une personne avant de voter.' });
    }
    if (comment.length > 500) {
      return res.status(400).json({ message: 'Commentaire trop long (500 caractères max).' });
    }

    const config = await prisma.communityConfig.findUnique({
      where: { id: 1 },
      select: { tiktokCreators: true, homeChallengeTheme: true }
    });

    const weekKey = getIsoWeekKey();
    const challengeTheme = String(config?.homeChallengeTheme || 'TIKTOKERS');
    const candidates = sanitizeTiktokCreators(config?.tiktokCreators || null);
    const candidateExists = candidates.some((item) => item.handle === handle);

    if (!candidateExists) {
      return res.status(400).json({ message: 'Candidat invalide pour ce challenge.' });
    }

    const existing = await prisma.homeChallengeVote.findUnique({
      where: {
        userId_weekKey_challengeTheme: {
          userId: req.user.id,
          weekKey,
          challengeTheme
        }
      }
    });

    if (existing) {
      return res.status(409).json({ message: 'Tu as déjà voté cette semaine.' });
    }

    const created = await prisma.homeChallengeVote.create({
      data: {
        userId: req.user.id,
        weekKey,
        challengeTheme,
        candidateHandle: handle,
        comment: comment || null
      },
      select: {
        id: true,
        candidateHandle: true,
        comment: true,
        createdAt: true
      }
    });

    return res.status(201).json({
      message: 'Vote enregistré avec succès.',
      vote: created
    });
  } catch (error) {
    return next(error);
  }
}

async function updateHomeChallengeVote(req, res, next) {
  try {
    const handle = String(req.body?.handle || '').trim();
    const comment = String(req.body?.comment || '').trim();

    if (!handle) {
      return res.status(400).json({ message: 'Choisis une personne avant de modifier le vote.' });
    }
    if (comment.length > 500) {
      return res.status(400).json({ message: 'Commentaire trop long (500 caractères max).' });
    }

    const config = await prisma.communityConfig.findUnique({
      where: { id: 1 },
      select: { tiktokCreators: true, homeChallengeTheme: true }
    });

    const weekKey = getIsoWeekKey();
    const challengeTheme = String(config?.homeChallengeTheme || 'TIKTOKERS');
    const candidates = sanitizeTiktokCreators(config?.tiktokCreators || null);
    const candidateExists = candidates.some((item) => item.handle === handle);
    if (!candidateExists) {
      return res.status(400).json({ message: 'Candidat invalide pour ce challenge.' });
    }

    const existing = await prisma.homeChallengeVote.findUnique({
      where: {
        userId_weekKey_challengeTheme: {
          userId: req.user.id,
          weekKey,
          challengeTheme
        }
      }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Aucun vote trouvé pour cette semaine.' });
    }

    const updated = await prisma.homeChallengeVote.update({
      where: {
        userId_weekKey_challengeTheme: {
          userId: req.user.id,
          weekKey,
          challengeTheme
        }
      },
      data: {
        candidateHandle: handle,
        comment: comment || null
      },
      select: {
        id: true,
        candidateHandle: true,
        comment: true,
        createdAt: true
      }
    });

    return res.json({
      message: 'Vote modifié avec succès.',
      vote: updated
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteHomeChallengeVote(req, res, next) {
  try {
    const config = await prisma.communityConfig.findUnique({
      where: { id: 1 },
      select: { homeChallengeTheme: true }
    });
    const weekKey = getIsoWeekKey();
    const challengeTheme = String(config?.homeChallengeTheme || 'TIKTOKERS');

    const deleted = await prisma.homeChallengeVote.deleteMany({
      where: {
        userId: req.user.id,
        weekKey,
        challengeTheme
      }
    });

    if (deleted.count === 0) {
      return res.status(404).json({ message: 'Aucun vote à supprimer pour cette semaine.' });
    }

    return res.json({ message: 'Vote supprimé.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listRecentBlogPosts,
  getPublicBlogPost,
  listProbableExercises,
  toggleProbableExerciseLike,
  addProbableExerciseComment,
  streamExamPdf,
  pingOnlinePresence,
  getOnlinePresenceStats,
  getHomeTikTokCreators,
  submitHomeChallengeVote,
  updateHomeChallengeVote,
  deleteHomeChallengeVote
};

