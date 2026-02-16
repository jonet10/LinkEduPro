const prisma = require('../../config/prisma');
const { getCommunityConfig } = require('../services/config.service');

async function enforcePostLimit(req, res, next) {
  try {
    if (req.user.role !== 'STUDENT') {
      return next();
    }

    const userId = req.user.id;
    const config = await getCommunityConfig();

    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(Date.UTC(dayStart.getUTCFullYear(), dayStart.getUTCMonth(), 1));

    const [dailyCount, monthlyCount] = await Promise.all([
      prisma.blogPost.count({ where: { authorId: userId, createdAt: { gte: dayStart } } }),
      prisma.blogPost.count({ where: { authorId: userId, createdAt: { gte: monthStart } } })
    ]);

    if (dailyCount >= config.maxPostsPerDay || monthlyCount >= config.maxPostsPerMonth) {
      return res.status(429).json({ message: 'Limite de publication atteinte' });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { enforcePostLimit };
