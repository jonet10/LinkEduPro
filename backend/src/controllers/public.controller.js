const prisma = require('../config/prisma');

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

module.exports = {
  listRecentBlogPosts,
  getPublicBlogPost
};

