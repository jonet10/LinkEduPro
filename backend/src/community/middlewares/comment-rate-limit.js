const prisma = require('../../config/prisma');
const { getCommunityConfig } = require('../services/config.service');

async function commentRateLimit(req, res, next) {
  try {
    const userId = req.user.id;
    const config = await getCommunityConfig();
    const start = new Date(Date.now() - 60 * 1000);

    const count = await prisma.blogComment.count({
      where: {
        authorId: userId,
        createdAt: { gte: start }
      }
    });

    if (count >= config.commentRatePerMin) {
      return res.status(429).json({ message: 'Rate limit commentaires atteint. Reessayez plus tard.' });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { commentRateLimit };
