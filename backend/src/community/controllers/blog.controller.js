const prisma = require('../../config/prisma');
const { addReputationPoints } = require('../services/reputation.service');
const { evaluateUserBadges } = require('../services/badge-rules.service');
const { createCommunityLog } = require('../services/log.service');
const { sanitizeText } = require('../utils/sanitize');
const { notifyAdmins } = require('../../services/notifications');

function getPagination(query) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(query.limit || 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

async function createPost(req, res, next) {
  try {
    const user = await prisma.student.findUnique({ where: { id: req.user.id } });
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur introuvable.' });
    }

    const isGlobal = req.body.isGlobal !== false;
    const schoolId = req.body.schoolId ? Number(req.body.schoolId) : null;
    const categoryIds = (req.body.categoryIds || []).map(Number);
    const tagIds = (req.body.tagIds || []).map(Number);

    if (isGlobal && user.role === 'TEACHER' && !['CERTIFIED', 'PREMIUM'].includes(user.teacherLevel)) {
      return res.status(403).json({ message: 'Seuls les professeurs certifies peuvent publier dans le blog global.' });
    }

    if (!isGlobal && !schoolId) {
      return res.status(400).json({ message: 'schoolId requis pour un blog interne.' });
    }

    const post = await prisma.blogPost.create({
      data: {
        authorId: req.user.id,
        title: sanitizeText(req.body.title, 180),
        excerpt: sanitizeText(req.body.excerpt || '', 400) || null,
        content: sanitizeText(req.body.content, 10000),
        isGlobal,
        schoolId,
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
    await evaluateUserBadges(req.user.id);

    await createCommunityLog({
      actorId: req.user.id,
      action: 'POST_CREATED',
      entityType: 'Post',
      entityId: String(post.id),
      metadata: { isGlobal, schoolId }
    });

    await notifyAdmins({
      type: 'BLOG_POST_CREATED',
      title: 'Nouveau post publie',
      message: `${user.firstName} ${user.lastName} a publie "${post.title}".`,
      entityType: 'Post',
      entityId: String(post.id)
    });

    return res.status(201).json({ post });
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
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const tagId = req.query.tagId ? Number(req.query.tagId) : undefined;

    const baseWhere = {
      isDeleted: false,
      ...(req.user.role === 'ADMIN' ? {} : { isApproved: true }),
      ...(isGlobal === 'true' ? { isGlobal: true } : {}),
      ...(isGlobal === 'false' ? { isGlobal: false } : {}),
      ...(schoolId ? { schoolId } : {}),
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

    const comment = await prisma.blogComment.create({
      data: {
        postId,
        authorId: req.user.id,
        content: sanitizeText(req.body.content, 2000)
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
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return res.json({ comments });
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
    const post = await prisma.blogPost.findUnique({ where: { id: postId } });
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: 'Post introuvable.' });
    }

    if (req.user.role !== 'ADMIN' && req.user.id !== post.authorId) {
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

module.exports = {
  createPost,
  listPosts,
  approvePost,
  likePost,
  createComment,
  listComments,
  markCommentHelpful,
  reportPost,
  listReports,
  reviewReport,
  softDeletePost,
  listCategories,
  createCategory,
  listTags,
  createTag
};
