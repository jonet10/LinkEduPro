const prisma = require('../../config/prisma');

async function createSchoolLog({ schoolId = null, actorId = null, actorRole = null, action, entityType, entityId = null, metadata = null }) {
  return prisma.schoolLog.create({
    data: {
      schoolId,
      actorId,
      actorRole,
      action,
      entityType,
      entityId,
      metadata
    }
  });
}

module.exports = { createSchoolLog };
