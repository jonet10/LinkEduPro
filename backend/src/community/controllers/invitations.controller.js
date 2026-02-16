const prisma = require('../../config/prisma');
const { generateInviteToken } = require('../utils/invite');
const { createCommunityLog } = require('../services/log.service');

async function createTeacherInvitation(req, res, next) {
  try {
    const { email, expiresInHours } = req.body;
    const token = generateInviteToken();
    const expiresAt = new Date(Date.now() + Number(expiresInHours || 72) * 60 * 60 * 1000);

    const invitation = await prisma.teacherInvitation.create({
      data: {
        email,
        token,
        expiresAt,
        createdBy: req.user.id
      }
    });

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = `${frontendBase}/invite-professeur/${token}`;

    await createCommunityLog({
      actorId: req.user.id,
      action: 'TEACHER_INVITATION_CREATED',
      entityType: 'TeacherInvitation',
      entityId: String(invitation.id),
      metadata: { email, expiresAt }
    });

    return res.status(201).json({ invitation, inviteLink });
  } catch (error) {
    return next(error);
  }
}

async function listTeacherInvitations(req, res, next) {
  try {
    const invitations = await prisma.teacherInvitation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200
    });

    return res.json({ invitations });
  } catch (error) {
    return next(error);
  }
}

async function validateInvitationToken(req, res, next) {
  try {
    const token = req.params.token;
    const invitation = await prisma.teacherInvitation.findUnique({ where: { token } });

    if (!invitation || invitation.used || invitation.expiresAt < new Date()) {
      return res.status(404).json({ valid: false, message: 'Invitation invalide ou expiree.' });
    }

    return res.json({ valid: true, email: invitation.email, expiresAt: invitation.expiresAt });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createTeacherInvitation,
  listTeacherInvitations,
  validateInvitationToken
};
