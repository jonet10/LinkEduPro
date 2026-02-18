const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { generateToken } = require('../utils/token');
const { toApiLevel } = require('../v2/utils/level');
const { sendSms } = require('../services/sms');

const OTP_EXPIRES_MINUTES = Number(process.env.PASSWORD_RESET_OTP_EXPIRES_MINUTES || 10);
const OTP_COOLDOWN_SECONDS = Number(process.env.PASSWORD_RESET_OTP_COOLDOWN_SECONDS || 60);
const OTP_MAX_ATTEMPTS = Number(process.env.PASSWORD_RESET_OTP_MAX_ATTEMPTS || 5);

function sanitizeStudent(student) {
  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    sex: student.sex,
    dateOfBirth: student.dateOfBirth,
    school: student.school,
    gradeLevel: student.gradeLevel,
    email: student.email,
    phone: student.phone,
    address: student.address,
    photoUrl: student.photoUrl,
    level: toApiLevel(student.level),
    darkMode: student.darkMode,
    role: student.role,
    teacherLevel: student.teacherLevel,
    reputationScore: student.reputationScore,
    createdAt: student.createdAt
  };
}

function hashResetCode(phone, code) {
  const secret = process.env.JWT_SECRET || 'linkedupro_reset_secret';
  return crypto.createHash('sha256').update(`${phone}:${code}:${secret}`).digest('hex');
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function register(req, res, next) {
  try {
    const {
      firstName,
      lastName,
      sex,
      dateOfBirth,
      school,
      gradeLevel,
      email,
      phone,
      password
    } = req.body;

    const normalizedEmail = email || null;

    if (normalizedEmail) {
      const existing = await prisma.student.findUnique({ where: { email: normalizedEmail } });
      if (existing) {
        return res.status(409).json({ message: 'Email deja utilise.' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const student = await prisma.student.create({
      data: {
        firstName,
        lastName,
        sex,
        dateOfBirth: new Date(dateOfBirth),
        school,
        gradeLevel,
        email: normalizedEmail,
        phone: phone || null,
        passwordHash,
        role: 'STUDENT'
      }
    });

    const token = generateToken(student);

    return res.status(201).json({ token, student: sanitizeStudent(student) });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { identifier, password } = req.body;

    const student = await prisma.student.findFirst({
      where: {
        OR: [{ email: identifier }, { phone: identifier }]
      }
    });

    if (!student) {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }

    const valid = await bcrypt.compare(password, student.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }

    const token = generateToken(student);
    return res.json({ token, student: sanitizeStudent(student) });
  } catch (error) {
    return next(error);
  }
}

async function acceptTeacherInvite(req, res, next) {
  try {
    const { token, firstName, lastName, password, sex, dateOfBirth, phone } = req.body;

    const invitation = await prisma.teacherInvitation.findUnique({ where: { token } });
    if (!invitation || invitation.used || invitation.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invitation invalide ou expiree.' });
    }

    const existing = await prisma.student.findUnique({ where: { email: invitation.email } });
    if (existing) {
      return res.status(409).json({ message: 'Un compte existe deja pour cet email.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const teacher = await prisma.$transaction(async (tx) => {
      const created = await tx.student.create({
        data: {
          firstName,
          lastName,
          sex: sex || 'OTHER',
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date('1990-01-01T00:00:00.000Z'),
          school: 'LinkEduPro',
          gradeLevel: 'TEACHER',
          email: invitation.email,
          phone: phone || null,
          passwordHash,
          role: 'TEACHER',
          teacherLevel: 'STANDARD'
        }
      });

      await tx.teacherInvitation.update({
        where: { id: invitation.id },
        data: { used: true, usedAt: new Date() }
      });

      return created;
    });

    const tokenJwt = generateToken(teacher);
    return res.status(201).json({ token: tokenJwt, student: sanitizeStudent(teacher) });
  } catch (error) {
    return next(error);
  }
}

async function validateTeacherInvite(req, res, next) {
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

async function requestPasswordReset(req, res, next) {
  try {
    const phone = req.body.phone.trim();
    const student = await prisma.student.findFirst({ where: { phone } });

    const genericResponse = { message: 'Si ce numero existe, un code de reinitialisation a ete envoye par SMS.' };

    if (!student) {
      return res.json(genericResponse);
    }

    const latest = await prisma.passwordResetCode.findFirst({
      where: {
        studentId: student.id,
        phone,
        usedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    if (latest && (now.getTime() - new Date(latest.createdAt).getTime()) / 1000 < OTP_COOLDOWN_SECONDS) {
      return res.status(429).json({ message: 'Veuillez patienter avant de demander un nouveau code.' });
    }

    const code = generateOtpCode();
    const codeHash = hashResetCode(phone, code);
    const expiresAt = new Date(now.getTime() + OTP_EXPIRES_MINUTES * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.passwordResetCode.updateMany({
        where: { studentId: student.id, usedAt: null },
        data: { usedAt: now }
      });

      await tx.passwordResetCode.create({
        data: {
          studentId: student.id,
          phone,
          codeHash,
          expiresAt
        }
      });
    });

    const smsText = `LinkEduPro: votre code de reinitialisation est ${code}. Expire dans ${OTP_EXPIRES_MINUTES} min.`;
    await sendSms({ to: phone, body: smsText });

    if (process.env.NODE_ENV !== 'production' && (process.env.SMS_PROVIDER || 'mock').toLowerCase() === 'mock') {
      return res.json({ ...genericResponse, devCode: code });
    }

    return res.json(genericResponse);
  } catch (error) {
    return next(error);
  }
}

async function verifyResetCode(req, res, next) {
  try {
    const phone = req.body.phone.trim();
    const code = req.body.code.trim();

    const reset = await prisma.passwordResetCode.findFirst({
      where: { phone, usedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    if (!reset) {
      return res.status(400).json({ message: 'Code invalide ou expire.' });
    }

    if (reset.expiresAt < new Date()) {
      await prisma.passwordResetCode.update({ where: { id: reset.id }, data: { usedAt: new Date() } });
      return res.status(400).json({ message: 'Code invalide ou expire.' });
    }

    if (reset.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ message: 'Trop de tentatives. Demandez un nouveau code.' });
    }

    const matches = hashResetCode(phone, code) === reset.codeHash;
    if (!matches) {
      await prisma.passwordResetCode.update({
        where: { id: reset.id },
        data: { attempts: { increment: 1 } }
      });
      return res.status(400).json({ message: 'Code invalide ou expire.' });
    }

    return res.json({ verified: true });
  } catch (error) {
    return next(error);
  }
}

async function resetPasswordWithCode(req, res, next) {
  try {
    const phone = req.body.phone.trim();
    const code = req.body.code.trim();
    const newPassword = req.body.newPassword;

    const reset = await prisma.passwordResetCode.findFirst({
      where: { phone, usedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    if (!reset || reset.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Code invalide ou expire.' });
    }

    if (reset.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ message: 'Trop de tentatives. Demandez un nouveau code.' });
    }

    const matches = hashResetCode(phone, code) === reset.codeHash;
    if (!matches) {
      await prisma.passwordResetCode.update({
        where: { id: reset.id },
        data: { attempts: { increment: 1 } }
      });
      return res.status(400).json({ message: 'Code invalide ou expire.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: reset.studentId },
        data: { passwordHash }
      });
      await tx.passwordResetCode.update({
        where: { id: reset.id },
        data: { usedAt: new Date() }
      });
    });

    return res.json({ message: 'Mot de passe reinitialise avec succes.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  login,
  acceptTeacherInvite,
  validateTeacherInvite,
  requestPasswordReset,
  verifyResetCode,
  resetPasswordWithCode
};
