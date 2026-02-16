const prisma = require('../../config/prisma');

async function getCommunityConfig() {
  const config = await prisma.communityConfig.findUnique({ where: { id: 1 } });
  if (config) return config;

  return prisma.communityConfig.create({
    data: {
      id: 1,
      maxPostsPerDay: 3,
      maxPostsPerMonth: 10,
      commentRatePerMin: 10
    }
  });
}

module.exports = { getCommunityConfig };
