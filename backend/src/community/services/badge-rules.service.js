const prisma = require('../../config/prisma');
const { grantBadge } = require('./badge.service');

async function evaluateUserBadges(userId) {
  const [postCount, commentCount, user] = await Promise.all([
    prisma.blogPost.count({ where: { authorId: Number(userId) } }),
    prisma.blogComment.count({ where: { authorId: Number(userId) } }),
    prisma.student.findUnique({ where: { id: Number(userId) }, select: { teacherLevel: true, reputationScore: true } })
  ]);

  if (postCount >= 1) {
    await grantBadge(userId, 'Premier Article');
  }

  if (postCount >= 10) {
    await grantBadge(userId, '10 Articles Publies');
  }

  if (commentCount >= 100) {
    await grantBadge(userId, '100 Commentaires');
  }

  if (user && ['VERIFIED', 'CERTIFIED', 'PREMIUM'].includes(user.teacherLevel)) {
    await grantBadge(userId, 'Professeur Verifie');
  }

  if (user && ['CERTIFIED', 'PREMIUM'].includes(user.teacherLevel)) {
    await grantBadge(userId, 'Professeur Certifie');
  }

  if (user && user.reputationScore >= 500) {
    await grantBadge(userId, 'Leader Educatif');
  }
}

module.exports = { evaluateUserBadges };
