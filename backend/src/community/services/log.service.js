const prisma = require('../../config/prisma');

async function createCommunityLog({ actorId = null, action, entityType, entityId = null, metadata = null }) {
  return prisma.communityLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      metadata
    }
  });
}

module.exports = { createCommunityLog };
