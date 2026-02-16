const prisma = require('../../config/prisma');
const { grantBadge } = require('./badge.service');

const reasons = {
  ARTICLE_PUBLISHED: { points: 5, reason: 'Article publie' },
  ARTICLE_APPROVED: { points: 10, reason: 'Article valide par Super Admin' },
  COMMENT_HELPFUL: { points: 2, reason: 'Commentaire utile' },
  ARTICLE_POPULAR: { points: 20, reason: 'Article populaire (50 likes)' }
};

async function addReputationPoints(userId, reasonKey) {
  const descriptor = reasons[reasonKey];
  if (!descriptor) {
    throw new Error('Raison reputation invalide.');
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.reputationPoint.create({
      data: {
        userId: Number(userId),
        points: descriptor.points,
        reason: descriptor.reason
      }
    });

    return tx.student.update({
      where: { id: Number(userId) },
      data: { reputationScore: { increment: descriptor.points } },
      select: { id: true, reputationScore: true }
    });
  });

  if (updated.reputationScore >= 500) {
    await grantBadge(updated.id, 'Leader Educatif');
  }

  return updated;
}

module.exports = {
  addReputationPoints,
  reasons
};
