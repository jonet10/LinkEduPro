const prisma = require('../../config/prisma');

const defaultBadges = [
  { name: 'Premier Article', description: 'Premier article publie', icon: 'badge-first-article' },
  { name: '10 Articles Publies', description: 'A publie 10 articles', icon: 'badge-ten-articles' },
  { name: '100 Commentaires', description: 'A publie 100 commentaires', icon: 'badge-comments-100' },
  { name: 'Professeur Verifie', description: 'Profil professeur verifie', icon: 'badge-teacher-verified' },
  { name: 'Professeur Certifie', description: 'Document professeur certifie', icon: 'badge-teacher-certified' },
  { name: 'Leader Educatif', description: 'Score de reputation >= 500', icon: 'badge-leader-educatif' }
];

async function ensureBadges() {
  await prisma.$transaction(
    defaultBadges.map((badge) =>
      prisma.badge.upsert({
        where: { name: badge.name },
        update: { description: badge.description, icon: badge.icon },
        create: badge
      })
    )
  );
}

async function grantBadge(userId, badgeName) {
  const badge = await prisma.badge.findUnique({ where: { name: badgeName } });
  if (!badge) return;

  await prisma.userBadge.upsert({
    where: { userId_badgeId: { userId: Number(userId), badgeId: badge.id } },
    update: {},
    create: { userId: Number(userId), badgeId: badge.id }
  });
}

module.exports = { ensureBadges, grantBadge };
