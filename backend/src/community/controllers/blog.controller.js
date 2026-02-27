const prisma = require('../../config/prisma');
const { addReputationPoints } = require('../services/reputation.service');
const { evaluateUserBadges } = require('../services/badge-rules.service');
const { createCommunityLog } = require('../services/log.service');
const { sanitizeText } = require('../utils/sanitize');
const { notifyAdmins } = require('../../services/notifications');

const ALLOWED_POST_TYPES = new Set(['ARTICLE', 'EXERCISE']);
const ALLOWED_AUDIENCE_SCOPES = new Set(['GLOBAL', 'INTER_SCHOOL', 'SCHOOL']);
const ALLOWED_EMOJIS = new Set(['👍', '❤️', '🔥', '👏', '🎉', '💡', '✅', '😍', '😮', '😂']);

function getPagination(query) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(query.limit || 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function normalizePostType(value) {
  const type = String(value || 'ARTICLE').trim().toUpperCase();
  return ALLOWED_POST_TYPES.has(type) ? type : 'ARTICLE';
}

function normalizeAudienceScope(value, isGlobal, schoolId) {
  const scope = String(value || '').trim().toUpperCase();
  if (ALLOWED_AUDIENCE_SCOPES.has(scope)) return scope;
  if (isGlobal === true) return 'GLOBAL';
  if (schoolId) return 'SCHOOL';
  return 'INTER_SCHOOL';
}

function generateTitleFromContent({ title, content, excerpt, postType }) {
  const direct = sanitizeText(title || '', 180);
  if (direct) return direct;

  const source = sanitizeText(excerpt || content || '', 180);
  if (!source) {
    return postType === 'EXERCISE' ? 'Demande d’aide sur un exercice' : 'Publication communauté';
  }

  const compact = source.replace(/\s+/g, ' ').trim();
  if (compact.length <= 80) return compact;
  return `${compact.slice(0, 77).trim()}...`;
}

async function createPost(req, res, next) {
  try {
    const user = await prisma.student.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur introuvable.' });
    }

    const requestedSchoolId = req.body.schoolId ? Number(req.body.schoolId) : null;
    const requestedIsGlobal = req.body.isGlobal !== false;
    let audienceScope = normalizeAudienceScope(req.body.audienceScope, requestedIsGlobal, requestedSchoolId);
    let isGlobal = audienceScope === 'GLOBAL';
    let schoolId = audienceScope === 'SCHOOL' ? requestedSchoolId : null;
    const postType = normalizePostType(req.body.postType);
    const categoryIds = (req.body.categoryIds || []).map(Number);
    const tagIds = (req.body.tagIds || []).map(Number);

    if (audienceScope === 'SCHOOL' && !schoolId) {
      return res.status(400).json({ message: 'schoolId requis pour une publication école.' });
    }
    if (postType === 'EXERCISE' && !['TEACHER', 'ADMIN'].includes(user.role)) {
      return res.status(403).json({ message: 'Seuls les professeurs et admins peuvent publier un exercice.' });
    }

    // Les publications des élèves restent dans le forum global.
    if (user.role === 'STUDENT') {
      audienceScope = 'GLOBAL';
      isGlobal = true;
      schoolId = null;
    }

    const isSuperAdmin = user.role === 'ADMIN' && process.env.SUPER_ADMIN_EMAIL && user.email === process.env.SUPER_ADMIN_EMAIL;
    const autoApproved = isSuperAdmin || ['ADMIN', 'TEACHER'].includes(user.role);

    const post = await prisma.blogPost.create({
      data: {
        authorId: req.user.id,
        title: generateTitleFromContent({
          title: req.body.title,
          content: req.body.content,
          excerpt: req.body.excerpt,
          postType
        }),
        excerpt: sanitizeText(req.body.excerpt || '', 400) || null,
        imageUrl: req.body.imageUrl ? String(req.body.imageUrl).trim() : null,
        content: sanitizeText(req.body.content, 10000),
        postType,
        audienceScope,
        isGlobal,
        schoolId,
        isApproved: autoApproved,
        approvedBy: autoApproved ? req.user.id : null,
        approvedAt: autoApproved ? new Date() : null,
        categories: {
          create: categoryIds.map((id) => ({ categoryId: id }))
        },
        tags: {
          create: tagIds.map((id) => ({ tagId: id }))
        }
      },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } }
      }
    });

    await addReputationPoints(req.user.id, 'ARTICLE_PUBLISHED');
    if (autoApproved && user.role === 'TEACHER') {
      await addReputationPoints(req.user.id, 'ARTICLE_APPROVED');
    }
    await evaluateUserBadges(req.user.id);

    await createCommunityLog({
      actorId: req.user.id,
      action: 'POST_CREATED',
      entityType: 'Post',
      entityId: String(post.id),
      metadata: { isGlobal, schoolId, audienceScope, postType }
    });

    await notifyAdmins({
      type: autoApproved ? 'BLOG_POST_CREATED' : 'BLOG_POST_PENDING',
      title: autoApproved ? 'Nouveau post publie' : 'Post en attente de validation',
      message: autoApproved
        ? `${user.firstName} ${user.lastName} a publie "${post.title}".`
        : `${user.firstName} ${user.lastName} a soumis "${post.title}" pour validation.`,
      entityType: 'Post',
      entityId: String(post.id)
    });

    return res.status(201).json({
      post,
      moderation: {
        status: post.isApproved ? 'APPROVED' : 'PENDING',
        requiresReview: !post.isApproved
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function updatePost(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const existing = await prisma.blogPost.findUnique({
      where: { id: postId },
      include: { categories: true, tags: true }
    });

    if (!existing || existing.isDeleted) {
      return res.status(404).json({ message: 'Post introuvable.' });
    }

    const actor = await prisma.student.findUnique({ where: { id: req.user.id } });
    if (!actor) {
      return res.status(401).json({ message: 'Utilisateur introuvable.' });
    }

    const canEdit = req.user.role === 'ADMIN' || req.user.id === existing.authorId;
    if (!canEdit) {
      return res.status(403).json({ message: 'Action non autorisee.' });
    }

    const isSuperAdmin = actor.role === 'ADMIN' && process.env.SUPER_ADMIN_EMAIL && actor.email === process.env.SUPER_ADMIN_EMAIL;
    const autoApproved = isSuperAdmin || ['ADMIN', 'TEACHER'].includes(actor.role);

    const requestedIsGlobal = req.body.isGlobal !== undefined ? req.body.isGlobal : existing.isGlobal;
    const requestedSchoolId = req.body.schoolId !== undefined ? (req.body.schoolId ? Number(req.body.schoolId) : null) : existing.schoolId;
    const nextAudienceScope = normalizeAudienceScope(
      req.body.audienceScope !== undefined ? req.body.audienceScope : existing.audienceScope,
      requestedIsGlobal,
      requestedSchoolId
    );
    const nextIsGlobal = nextAudienceScope === 'GLOBAL';
    const nextSchoolId = nextAudienceScope === 'SCHOOL' ? requestedSchoolId : null;
    const nextPostType = normalizePostType(req.body.postType !== undefined ? req.body.postType : existing.postType);

    if (nextAudienceScope === 'SCHOOL' && !nextSchoolId) {
      return res.status(400).json({ message: 'schoolId requis pour une publication école.' });
    }
    if (nextPostType === 'EXERCISE' && !['TEACHER', 'ADMIN'].includes(actor.role)) {
      return res.status(403).json({ message: 'Seuls les professeurs et admins peuvent publier un exercice.' });
    }

    const categoryIds = Array.isArray(req.body.categoryIds) ? req.body.categoryIds.map(Number) : null;
    const tagIds = Array.isArray(req.body.tagIds) ? req.body.tagIds.map(Number) : null;

    const updated = await prisma.$transaction(async (tx) => {
      if (categoryIds) {
        await tx.postCategoryOnPost.deleteMany({ where: { postId } });
      }

      if (tagIds) {
        await tx.postTagOnPost.deleteMany({ where: { postId } });
      }

      return tx.blogPost.update({
        where: { id: postId },
        data: {
          title: req.body.title !== undefined ? sanitizeText(req.body.title, 180) : undefined,
          excerpt: req.body.excerpt !== undefined ? (sanitizeText(req.body.excerpt || '', 400) || null) : undefined,
          imageUrl: req.body.imageUrl !== undefined ? (req.body.imageUrl ? String(req.body.imageUrl).trim() : null) : undefined,
          content: req.body.content !== undefined ? sanitizeText(req.body.content, 10000) : undefined,
          postType: req.body.postType !== undefined ? nextPostType : undefined,
          audienceScope: req.body.audienceScope !== undefined ? nextAudienceScope : undefined,
          isGlobal: nextIsGlobal,
          schoolId: nextSchoolId,
          isApproved: autoApproved ? true : false,
          approvedBy: autoApproved ? req.user.id : null,
          approvedAt: autoApproved ? new Date() : null,
          categories: categoryIds
            ? {
                create: categoryIds.map((id) => ({ categoryId: id }))
              }
            : undefined,
          tags: tagIds
            ? {
                create: tagIds.map((id) => ({ tagId: id }))
              }
            : undefined
        },
        include: {
          categories: { include: { category: true } },
          tags: { include: { tag: true } }
        }
      });
    });

    await createCommunityLog({
      actorId: req.user.id,
      action: 'POST_UPDATED',
      entityType: 'Post',
      entityId: String(postId),
      metadata: { autoApproved }
    });

    return res.json({
      post: updated,
      moderation: {
        status: updated.isApproved ? 'APPROVED' : 'PENDING',
        requiresReview: !updated.isApproved
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function listPosts(req, res, next) {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const search = sanitizeText(req.query.search || '', 120);
    const isGlobal = req.query.isGlobal;
    const schoolId = req.query.schoolId ? Number(req.query.schoolId) : undefined;
    const postType = req.query.postType ? normalizePostType(req.query.postType) : undefined;
    const audienceScope = req.query.audienceScope
      ? normalizeAudienceScope(req.query.audienceScope, undefined, undefined)
      : undefined;
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const tagId = req.query.tagId ? Number(req.query.tagId) : undefined;

    const requestedStatus = req.query.status ? String(req.query.status).toUpperCase() : undefined;
    const canReview = ['ADMIN', 'TEACHER'].includes(req.user.role);
    const visibilityWhere = canReview
      ? (requestedStatus === 'PENDING'
          ? { isApproved: false }
          : requestedStatus === 'APPROVED'
            ? { isApproved: true }
            : {})
      : { isApproved: true };

    const baseWhere = {
      isDeleted: false,
      ...visibilityWhere,
      ...(isGlobal === 'true' ? { isGlobal: true } : {}),
      ...(isGlobal === 'false' ? { isGlobal: false } : {}),
      ...(schoolId ? { schoolId } : {}),
      ...(postType ? { postType } : {}),
      ...(audienceScope ? { audienceScope } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { content: { contains: search, mode: 'insensitive' } }
            ]
          }
        : {})
    };

    const where = {
      ...baseWhere,
      ...(categoryId ? { categories: { some: { categoryId } } } : {}),
      ...(tagId ? { tags: { some: { tagId } } } : {})
    };

    const [total, posts] = await Promise.all([
      prisma.blogPost.count({ where }),
      prisma.blogPost.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true,
              teacherLevel: true,
              reputationScore: true
            }
          },
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
          _count: { select: { comments: true, likes: true, reports: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    return res.json({
      items: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (error) {
    return next(error);
  }
}

async function approvePost(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const post = await prisma.blogPost.findUnique({ where: { id: postId } });

    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post introuvable.' });
    }

    if (post.isApproved) {
      return res.status(400).json({ message: 'Post deja approuve.' });
    }

    const approved = await prisma.blogPost.update({
      where: { id: postId },
      data: {
        isApproved: true,
        approvedBy: req.user.id,
        approvedAt: new Date()
      }
    });

    await addReputationPoints(post.authorId, 'ARTICLE_APPROVED');
    await evaluateUserBadges(post.authorId);

    await createCommunityLog({
      actorId: req.user.id,
      action: 'POST_APPROVED',
      entityType: 'Post',
      entityId: String(postId),
      metadata: { authorId: post.authorId }
    });

    return res.json({ post: approved });
  } catch (error) {
    return next(error);
  }
}

async function likePost(req, res, next) {
  try {
    const postId = Number(req.params.postId);

    const post = await prisma.blogPost.findUnique({ where: { id: postId } });
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post introuvable.' });
    }

    await prisma.blogPostLike.create({
      data: {
        postId,
        userId: req.user.id
      }
    });

    const updated = await prisma.blogPost.update({
      where: { id: postId },
      data: { likeCount: { increment: 1 } },
      select: { id: true, likeCount: true, authorId: true }
    });

    if (updated.likeCount >= 50) {
      const alreadyAwarded = await prisma.communityLog.findFirst({
        where: {
          action: 'ARTICLE_POPULAR_AWARDED',
          entityType: 'Post',
          entityId: String(postId)
        }
      });

      if (!alreadyAwarded) {
        await addReputationPoints(updated.authorId, 'ARTICLE_POPULAR');
        await evaluateUserBadges(updated.authorId);
        await createCommunityLog({
          actorId: req.user.id,
          action: 'ARTICLE_POPULAR_AWARDED',
          entityType: 'Post',
          entityId: String(postId),
          metadata: { authorId: updated.authorId }
        });
      }
    }

    return res.status(201).json({ post: updated });
  } catch (error) {
    if (error && error.code === 'P2002') {
      return res.status(409).json({ message: 'Post deja like par cet utilisateur.' });
    }
    return next(error);
  }
}

async function createComment(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const post = await prisma.blogPost.findUnique({ where: { id: postId } });
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post introuvable.' });
    }

    const content = sanitizeText(req.body.content || '', 2000);
    const imageUrl = req.body.imageUrl ? String(req.body.imageUrl).trim() : null;
    if (!content && !imageUrl) {
      return res.status(400).json({ message: 'Commentaire vide: texte ou image requis.' });
    }

    const comment = await prisma.blogComment.create({
      data: {
        postId,
        authorId: req.user.id,
        content,
        imageUrl
      }
    });

    await createCommunityLog({
      actorId: req.user.id,
      action: 'COMMENT_CREATED',
      entityType: 'Comment',
      entityId: String(comment.id)
    });

    return res.status(201).json({ comment });
  } catch (error) {
    return next(error);
  }
}

async function listComments(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const comments = await prisma.blogComment.findMany({
      where: { postId, isDeleted: false },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            teacherLevel: true,
            reputationScore: true
          }
        },
        corrector: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    const commentIds = comments.map((c) => c.id);
    let reactions = [];
    if (commentIds.length) {
      reactions = await prisma.blogCommentReaction.findMany({
        where: { commentId: { in: commentIds } },
        select: { commentId: true, userId: true, emoji: true }
      });
    }

    const summaryMap = new Map();
    const myMap = new Map();
    for (const row of reactions) {
      if (!summaryMap.has(row.commentId)) summaryMap.set(row.commentId, {});
      const bucket = summaryMap.get(row.commentId);
      bucket[row.emoji] = (bucket[row.emoji] || 0) + 1;
      if (row.userId === req.user.id) myMap.set(row.commentId, row.emoji);
    }

    const mapped = comments.map((c) => ({
      ...c,
      reactions: summaryMap.get(c.id) || {},
      myReaction: myMap.get(c.id) || null
    }));

    return res.json({ comments: mapped });
  } catch (error) {
    return next(error);
  }
}

async function reactToComment(req, res, next) {
  try {
    const commentId = Number(req.params.commentId);
    const emoji = String(req.body.emoji || '').trim();

    if (!ALLOWED_EMOJIS.has(emoji)) {
      return res.status(400).json({ message: 'Emoji non pris en charge.' });
    }

    const comment = await prisma.blogComment.findUnique({ where: { id: commentId } });
    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: 'Commentaire introuvable.' });
    }

    const existing = await prisma.blogCommentReaction.findUnique({
      where: { commentId_userId: { commentId, userId: req.user.id } }
    });

    let myReaction = emoji;
    if (existing && existing.emoji === emoji) {
      await prisma.blogCommentReaction.delete({
        where: { commentId_userId: { commentId, userId: req.user.id } }
      });
      myReaction = null;
    } else if (existing) {
      await prisma.blogCommentReaction.update({
        where: { commentId_userId: { commentId, userId: req.user.id } },
        data: { emoji }
      });
    } else {
      await prisma.blogCommentReaction.create({
        data: { commentId, userId: req.user.id, emoji }
      });
    }

    const rows = await prisma.blogCommentReaction.groupBy({
      by: ['emoji'],
      where: { commentId },
      _count: { _all: true }
    });
    const reactions = {};
    rows.forEach((row) => { reactions[row.emoji] = row._count._all; });

    return res.json({ commentId, reactions, myReaction });
  } catch (error) {
    return next(error);
  }
}

async function reviewComment(req, res, next) {
  try {
    const commentId = Number(req.params.commentId);
    const {
      correctionStatus,
      score,
      maxScore,
      teacherFeedback,
      pinBest
    } = req.body;

    if (
      score !== null && maxScore !== null &&
      Number.isFinite(Number(score)) && Number.isFinite(Number(maxScore)) &&
      Number(score) > Number(maxScore)
    ) {
      return res.status(400).json({ message: 'Le score ne peut pas dépasser le barème.' });
    }

    const comment = await prisma.blogComment.findUnique({
      where: { id: commentId },
      include: { post: true }
    });
    if (!comment || comment.isDeleted || comment.post?.isDeleted) {
      return res.status(404).json({ message: 'Commentaire introuvable.' });
    }
    if (comment.post.postType !== 'EXERCISE') {
      return res.status(400).json({ message: 'La correction guidée est disponible uniquement pour les exercices.' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (pinBest) {
        await tx.blogComment.updateMany({
          where: { postId: comment.postId, isPinnedBest: true },
          data: { isPinnedBest: false }
        });
      }

      return tx.blogComment.update({
        where: { id: commentId },
        data: {
          correctionStatus,
          score: score === null ? null : Number(score),
          maxScore: maxScore === null ? null : Number(maxScore),
          teacherFeedback: teacherFeedback ? sanitizeText(teacherFeedback, 2000) : null,
          isPinnedBest: Boolean(pinBest),
          correctedBy: req.user.id,
          correctedAt: new Date()
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true
            }
          },
          corrector: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              role: true
            }
          }
        }
      });
    });

    await createCommunityLog({
      actorId: req.user.id,
      action: 'COMMENT_REVIEWED',
      entityType: 'Comment',
      entityId: String(commentId),
      metadata: {
        postId: comment.postId,
        correctionStatus,
        score: updated.score,
        maxScore: updated.maxScore,
        isPinnedBest: updated.isPinnedBest
      }
    });

    return res.json({ comment: updated });
  } catch (error) {
    return next(error);
  }
}

async function markCommentHelpful(req, res, next) {
  try {
    const commentId = Number(req.params.commentId);
    const comment = await prisma.blogComment.findUnique({ where: { id: commentId } });

    if (!comment || comment.isDeleted) {
      return res.status(404).json({ message: 'Commentaire introuvable.' });
    }

    if (comment.isHelpful) {
      return res.status(400).json({ message: 'Commentaire deja marque utile.' });
    }

    const updated = await prisma.blogComment.update({
      where: { id: commentId },
      data: { isHelpful: true }
    });

    await addReputationPoints(comment.authorId, 'COMMENT_HELPFUL');
    await evaluateUserBadges(comment.authorId);

    await createCommunityLog({
      actorId: req.user.id,
      action: 'COMMENT_MARKED_HELPFUL',
      entityType: 'Comment',
      entityId: String(commentId),
      metadata: { authorId: comment.authorId }
    });

    return res.json({ comment: updated });
  } catch (error) {
    return next(error);
  }
}

async function reportPost(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const post = await prisma.blogPost.findUnique({ where: { id: postId } });
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post introuvable.' });
    }

    const report = await prisma.postReport.create({
      data: {
        postId,
        reportedBy: req.user.id,
        reason: sanitizeText(req.body.reason, 120),
        details: sanitizeText(req.body.details || '', 1000) || null
      }
    });

    await createCommunityLog({
      actorId: req.user.id,
      action: 'POST_REPORTED',
      entityType: 'PostReport',
      entityId: String(report.id),
      metadata: { postId }
    });

    return res.status(201).json({ report });
  } catch (error) {
    return next(error);
  }
}

async function listReports(req, res, next) {
  try {
    const status = req.query.status ? String(req.query.status).toUpperCase() : undefined;
    const reports = await prisma.postReport.findMany({
      where: status ? { status } : {},
      include: {
        post: { select: { id: true, title: true, authorId: true } },
        reporter: { select: { id: true, firstName: true, lastName: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    return res.json({ reports });
  } catch (error) {
    return next(error);
  }
}

async function reviewReport(req, res, next) {
  try {
    const id = Number(req.params.reportId);
    const status = req.body.status;
    const report = await prisma.postReport.findUnique({ where: { id } });

    if (!report) {
      return res.status(404).json({ message: 'Signalement introuvable.' });
    }

    const updated = await prisma.postReport.update({
      where: { id },
      data: {
        status,
        reviewedBy: req.user.id,
        reviewedAt: new Date()
      }
    });

    await createCommunityLog({
      actorId: req.user.id,
      action: 'POST_REPORT_REVIEWED',
      entityType: 'PostReport',
      entityId: String(id),
      metadata: { status }
    });

    return res.json({ report: updated });
  } catch (error) {
    return next(error);
  }
}

async function softDeletePost(req, res, next) {
  try {
    const postId = Number(req.params.postId);
    const post = await prisma.blogPost.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            role: true
          }
        }
      }
    });
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post introuvable.' });
    }

    const isAdmin = req.user.role === 'ADMIN';
    const isOwner = req.user.id === post.authorId;
    const isTeacherDeletingStudentPost = req.user.role === 'TEACHER' && post.author?.role === 'STUDENT';

    if (!isAdmin && !isOwner && !isTeacherDeletingStudentPost) {
      return res.status(403).json({ message: 'Action non autorisee.' });
    }

    await prisma.blogPost.update({
      where: { id: postId },
      data: { isDeleted: true, deletedAt: new Date() }
    });

    await createCommunityLog({
      actorId: req.user.id,
      action: 'POST_SOFT_DELETED',
      entityType: 'Post',
      entityId: String(postId)
    });

    return res.json({ message: 'Post supprime (soft delete).' });
  } catch (error) {
    return next(error);
  }
}

async function listCategories(req, res, next) {
  try {
    const categories = await prisma.postCategory.findMany({ orderBy: { name: 'asc' } });
    return res.json({ categories });
  } catch (error) {
    return next(error);
  }
}

async function createCategory(req, res, next) {
  try {
    const name = sanitizeText(req.body.name, 80);
    const slug = sanitizeText(req.body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), 80);
    const description = sanitizeText(req.body.description || '', 255) || null;
    const category = await prisma.postCategory.create({ data: { name, slug, description } });
    return res.status(201).json({ category });
  } catch (error) {
    if (error && error.code === 'P2002') {
      return res.status(409).json({ message: 'Categorie deja existante.' });
    }
    return next(error);
  }
}

async function listTags(req, res, next) {
  try {
    const tags = await prisma.postTag.findMany({ orderBy: { name: 'asc' } });
    return res.json({ tags });
  } catch (error) {
    return next(error);
  }
}

async function createTag(req, res, next) {
  try {
    const name = sanitizeText(req.body.name, 60);
    const slug = sanitizeText(req.body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), 80);
    const tag = await prisma.postTag.create({ data: { name, slug } });
    return res.status(201).json({ tag });
  } catch (error) {
    if (error && error.code === 'P2002') {
      return res.status(409).json({ message: 'Tag deja existant.' });
    }
    return next(error);
  }
}

async function uploadPostImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucune image envoyée.' });
    }

    const imageUrl = `/storage/blog-images/${req.file.filename}`;
    return res.status(201).json({ imageUrl });
  } catch (error) {
    return next(error);
  }
}

async function getReviewSummary(req, res, next) {
  try {
    if (!['TEACHER', 'ADMIN'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Acces reserve professeur/admin.' });
    }

    const wherePosts = {
      isDeleted: false,
      postType: 'EXERCISE',
      ...(req.user.role === 'TEACHER' ? { authorId: req.user.id } : {})
    };

    const [pendingCount, correctedCount, pinnedCount, pendingItems] = await Promise.all([
      prisma.blogComment.count({
        where: {
          isDeleted: false,
          correctionStatus: 'PENDING',
          post: wherePosts
        }
      }),
      prisma.blogComment.count({
        where: {
          isDeleted: false,
          correctionStatus: 'CORRECTED',
          post: wherePosts
        }
      }),
      prisma.blogComment.count({
        where: {
          isDeleted: false,
          isPinnedBest: true,
          post: wherePosts
        }
      }),
      prisma.blogComment.findMany({
        where: {
          isDeleted: false,
          correctionStatus: 'PENDING',
          post: wherePosts
        },
        orderBy: { createdAt: 'asc' },
        take: 20,
        select: {
          id: true,
          createdAt: true,
          author: {
            select: { firstName: true, lastName: true }
          },
          post: {
            select: { id: true, title: true }
          }
        }
      })
    ]);

    return res.json({
      stats: {
        pending: pendingCount,
        corrected: correctedCount,
        pinnedBest: pinnedCount
      },
      pendingItems: pendingItems.map((row) => ({
        commentId: row.id,
        createdAt: row.createdAt,
        studentName: `${row.author?.firstName || ''} ${row.author?.lastName || ''}`.trim() || 'Élève',
        postId: row.post.id,
        postTitle: row.post.title
      }))
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createPost,
  updatePost,
  listPosts,
  approvePost,
  likePost,
  createComment,
  listComments,
  reviewComment,
  reactToComment,
  markCommentHelpful,
  reportPost,
  listReports,
  reviewReport,
  softDeletePost,
  listCategories,
  createCategory,
  listTags,
  createTag,
  uploadPostImage,
  getReviewSummary
};
