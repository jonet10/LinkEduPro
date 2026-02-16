const prisma = require('../../config/prisma');
const { getReputationLevel } = require('../utils/reputation');

async function getUserProfile(req, res, next) {
  try {
    const userId = Number(req.params.userId);

    const user = await prisma.student.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        role: true,
        teacherLevel: true,
        reputationScore: true,
        userBadges: {
          include: {
            badge: true
          }
        },
        _count: {
          select: {
            posts: true,
            comments: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    return res.json({
      profile: {
        ...user,
        reputationLevel: getReputationLevel(user.reputationScore)
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getUserProfile };
