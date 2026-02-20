const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { generateToken } = require('../utils/token');
const { toApiLevel } = require('../v2/utils/level');
const { sendEmail } = require('../services/email');

const OTP_EXPIRES_MINUTES = Number(process.env.PASSWORD_RESET_OTP_EXPIRES_MINUTES || 10);
const OTP_COOLDOWN_SECONDS = Number(process.env.PASSWORD_RESET_OTP_COOLDOWN_SECONDS || 60);
const OTP_MAX_ATTEMPTS = Number(process.env.PASSWORD_RESET_OTP_MAX_ATTEMPTS || 5);
const EMAIL_VERIFICATION_EXPIRES_MINUTES = Number(process.env.EMAIL_VERIFICATION_EXPIRES_MINUTES || 20);
const EMAIL_VERIFICATION_COOLDOWN_SECONDS = Number(process.env.EMAIL_VERIFICATION_COOLDOWN_SECONDS || 120);
const ACADEMIC_LEVEL_TO_DB = {
  '9e': 'LEVEL_9E',
  nsi: 'NSI',
  nsii: 'NSII',
  nsiii: 'NSIII',
  nsiv: 'NSIV',
  universitaire: 'UNIVERSITAIRE'
};
const ACADEMIC_LEVEL_TO_API = {
  LEVEL_9E: '9e',
  NSI: 'NSI',
  NSII: 'NSII',
  NSIII: 'NSIII',
  NSIV: 'NSIV',
  UNIVERSITAIRE: 'Universitaire'
};
const NSIV_TRACKS = new Set(['ORDINAIRE', 'SVT', 'SMP', 'SES', 'LLA', 'AUTRE']);

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
    emailVerified: student.emailVerified,
    academicLevel: student.studentProfile ? ACADEMIC_LEVEL_TO_API[student.studentProfile.level] : null,
    nsivTrack: student.studentProfile?.nsivTrack || null,
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

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : null;
}

function parseAcademicLevel(value) {
  if (typeof value !== 'string') return null;
  return ACADEMIC_LEVEL_TO_DB[value.trim().toLowerCase()] || null;
}

function mapAcademicLevelToEducationLevel(academicLevel) {
  switch (academicLevel) {
    case 'LEVEL_9E':
      return 'LEVEL_9E';
    case 'NSI':
      return 'NS1';
    case 'NSII':
      return 'NS2';
    case 'NSIII':
      return 'NS3';
    case 'NSIV':
      return 'TERMINALE';
    case 'UNIVERSITAIRE':
      return 'UNIVERSITE';
    default:
      return null;
  }
}

function hashEmailVerificationToken(token) {
  const secret = process.env.JWT_SECRET || 'linkedupro_email_verification_secret';
  return crypto.createHash('sha256').update(`${token}:${secret}`).digest('hex');
}

function buildEmailVerificationLink(token) {
  const frontend = (process.env.FRONTEND_URL || 'https://linkedupro.com').replace(/\/$/, '');
  return `${frontend}/verify-email?token=${encodeURIComponent(token)}`;
}

function getVerificationIssuedAt(student) {
  if (!student?.tokenExpiry) return null;
  return new Date(student.tokenExpiry.getTime() - EMAIL_VERIFICATION_EXPIRES_MINUTES * 60 * 1000);
}

function createEmailVerificationToken() {
  const plainToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashEmailVerificationToken(plainToken);
  const tokenExpiry = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRES_MINUTES * 60 * 1000);
  return { plainToken, tokenHash, tokenExpiry };
}

async function sendVerificationEmail({ to, name, token }) {
  const link = buildEmailVerificationLink(token);
  const displayName = (name || '').trim() || 'Utilisateur';
  const subject = 'Activez votre compte LinkEduPro';
  const text = `Bonjour ${displayName}, cliquez sur ce lien pour activer votre compte : ${link}. Ce lien expire dans 20 minutes.`;
  const html = `<p>Bonjour ${displayName},</p><p>Cliquez sur ce lien pour activer votre compte : <a href="${link}">${link}</a>.</p><p>Ce lien expire dans 20 minutes.</p>`;

  await sendEmail({ to, subject, html, text });
}

async function verifyAndConsumeEmailToken(rawToken) {
  const token = typeof rawToken === 'string' ? rawToken.trim() : '';
  if (!token) {
    return { ok: false, message: 'Token de verification manquant.' };
  }

  const tokenHash = hashEmailVerificationToken(token);
  const student = await prisma.student.findFirst({
    where: {
      verificationToken: tokenHash,
      emailVerified: false
    }
  });

  if (!student) {
    return { ok: false, message: 'Lien de verification invalide ou deja utilise.' };
  }

  const now = new Date();
  if (!student.tokenExpiry || student.tokenExpiry < now) {
    await prisma.student.update({
      where: { id: student.id },
      data: {
        verificationToken: null,
        tokenExpiry: null
      }
    });
    return { ok: false, message: 'Lien de verification expire.' };
  }

  await prisma.student.update({
    where: { id: student.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      tokenExpiry: null
    }
  });

  return { ok: true, message: 'Email verifie avec succes.' };
}

function hashResetCode(email, code) {
  const secret = process.env.JWT_SECRET || 'linkedupro_reset_secret';
  return crypto.createHash('sha256').update(`${email}:${code}:${secret}`).digest('hex');
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
      role,
      academicLevel,
      nsivTrack,
      email,
      phone,
      password
    } = req.body;

    if (role !== 'STUDENT') {
      return res.status(400).json({ message: "Inscription directe disponible uniquement pour les eleves." });
    }

    const parsedAcademicLevel = parseAcademicLevel(academicLevel);
    if (!parsedAcademicLevel) {
      return res.status(400).json({ message: 'Niveau academique invalide.' });
    }

    let normalizedNsivTrack = null;
    if (parsedAcademicLevel === 'NSIV') {
      const rawTrack = typeof nsivTrack === 'string' ? nsivTrack.trim().toUpperCase() : 'ORDINAIRE';
      if (!NSIV_TRACKS.has(rawTrack)) {
        return res.status(400).json({ message: 'Filiere NSIV invalide.' });
      }
      normalizedNsivTrack = rawTrack;
    }

    const normalizedEmail = normalizeEmail(email);

    const existing = await prisma.student.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ message: 'Email deja utilise.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { plainToken, tokenHash, tokenExpiry } = createEmailVerificationToken();

    const student = await prisma.$transaction(async (tx) => {
      const created = await tx.student.create({
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
          role: 'STUDENT',
          emailVerified: false,
          verificationToken: tokenHash,
          tokenExpiry,
          level: mapAcademicLevelToEducationLevel(parsedAcademicLevel)
        }
      });

      await tx.studentProfile.create({
        data: {
          userId: created.id,
          level: parsedAcademicLevel,
          nsivTrack: normalizedNsivTrack
        }
      });

      return tx.student.findUnique({
        where: { id: created.id },
        include: { studentProfile: true }
      });
    });

    try {
      await sendVerificationEmail({
        to: normalizedEmail,
        name: `${firstName} ${lastName}`,
        token: plainToken
      });
    } catch (mailError) {
      console.error('Email verification send failed on register:', mailError);
      return res.status(503).json({
        message: "Compte cree, mais l'email de verification n'a pas pu etre envoye. Utilisez 'Renvoyer email'.",
        code: 'EMAIL_SERVICE_UNAVAILABLE',
        requiresEmailVerification: true,
        email: normalizedEmail
      });
    }

    const response = {
      message: 'Un email de verification a ete envoye. Veuillez verifier votre boite mail.',
      requiresEmailVerification: true
    };
    if (process.env.NODE_ENV !== 'production' && (process.env.EMAIL_PROVIDER || 'brevo').toLowerCase() === 'mock') {
      response.devVerificationToken = plainToken;
    }

    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { identifier, password } = req.body;
    const normalizedIdentifier = identifier.trim();
    const emailIdentifier = normalizedIdentifier.includes('@') ? normalizeEmail(normalizedIdentifier) : null;

    const student = await prisma.student.findFirst({
      where: {
        OR: [{ email: emailIdentifier || normalizedIdentifier }, { phone: normalizedIdentifier }]
      },
      include: { studentProfile: true }
    });

    if (!student) {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }

    const valid = await bcrypt.compare(password, student.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Identifiants invalides.' });
    }

    if (!student.emailVerified) {
      return res.status(403).json({
        message: 'Veuillez verifier votre email pour activer votre compte.',
        code: 'EMAIL_NOT_VERIFIED',
        email: student.email
      });
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
          teacherLevel: 'STANDARD',
          emailVerified: true,
          verificationToken: null,
          tokenExpiry: null
        }
      });

      await tx.teacherInvitation.update({
        where: { id: invitation.id },
        data: { used: true, usedAt: new Date() }
      });

      return tx.student.findUnique({
        where: { id: created.id },
        include: { studentProfile: true }
      });
    });

    const tokenJwt = generateToken(teacher);
    return res.status(201).json({ token: tokenJwt, student: sanitizeStudent(teacher) });
  } catch (error) {
    return next(error);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const result = await verifyAndConsumeEmailToken(req.body.token);
    if (!result.ok) {
      return res.status(400).json({ message: result.message });
    }
    return res.json({ message: result.message });
  } catch (error) {
    return next(error);
  }
}

async function verifyEmailByLink(req, res, next) {
  try {
    const frontendBase = (process.env.FRONTEND_URL || 'https://linkedupro.com').replace(/\/$/, '');
    const result = await verifyAndConsumeEmailToken(req.query.token);
    const query = `verified=${result.ok ? '1' : '0'}&message=${encodeURIComponent(result.message)}`;
    return res.redirect(`${frontendBase}/login?${query}`);
  } catch (error) {
    return next(error);
  }
}

async function resendVerificationEmail(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const genericResponse = { message: 'Si ce compte existe, un email de verification a ete envoye.' };

    const student = await prisma.student.findUnique({ where: { email } });

    if (!student) {
      return res.json(genericResponse);
    }

    if (student.emailVerified) {
      return res.json({ message: 'Cet email est deja verifie.' });
    }

    const now = new Date();
    const issuedAt = getVerificationIssuedAt(student);
    if (issuedAt && now.getTime() - issuedAt.getTime() < EMAIL_VERIFICATION_COOLDOWN_SECONDS * 1000) {
      return res.status(429).json({ message: 'Veuillez patienter 2 minutes avant de renvoyer un email.' });
    }

    const { plainToken, tokenHash, tokenExpiry } = createEmailVerificationToken();

    await prisma.student.update({
      where: { id: student.id },
      data: {
        verificationToken: tokenHash,
        tokenExpiry
      }
    });

    try {
      await sendVerificationEmail({
        to: student.email,
        name: `${student.firstName} ${student.lastName}`,
        token: plainToken
      });
    } catch (mailError) {
      console.error('Email verification resend failed:', mailError);
      return res.status(503).json({
        message: 'Service email indisponible pour le moment. Reessayez plus tard.',
        code: 'EMAIL_SERVICE_UNAVAILABLE'
      });
    }

    if (process.env.NODE_ENV !== 'production' && (process.env.EMAIL_PROVIDER || 'brevo').toLowerCase() === 'mock') {
      return res.json({ ...genericResponse, devVerificationToken: plainToken });
    }
    return res.json(genericResponse);
  } catch (error) {
    return next(error);
  }
}

async function updateUnverifiedEmail(req, res, next) {
  try {
    const currentEmail = normalizeEmail(req.body.email);
    const newEmail = normalizeEmail(req.body.newEmail);
    const password = req.body.password;

    if (!currentEmail || !newEmail) {
      return res.status(400).json({ message: 'Email actuel et nouvel email requis.' });
    }

    if (currentEmail === newEmail) {
      return res.status(400).json({ message: 'Le nouvel email doit etre different.' });
    }

    const student = await prisma.student.findUnique({ where: { email: currentEmail } });
    if (!student) {
      return res.status(404).json({ message: 'Compte introuvable pour cet email.' });
    }

    if (student.emailVerified) {
      return res.status(400).json({ message: 'Cet email est deja verifie.' });
    }

    const valid = await bcrypt.compare(password, student.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: 'Mot de passe invalide.' });
    }

    const taken = await prisma.student.findUnique({ where: { email: newEmail } });
    if (taken) {
      return res.status(409).json({ message: 'Le nouvel email est deja utilise.' });
    }

    const { plainToken, tokenHash, tokenExpiry } = createEmailVerificationToken();

    await prisma.student.update({
      where: { id: student.id },
      data: {
        email: newEmail,
        emailVerified: false,
        verificationToken: tokenHash,
        tokenExpiry
      }
    });

    await sendVerificationEmail({
      to: newEmail,
      name: `${student.firstName} ${student.lastName}`,
      token: plainToken
    });

    const response = { message: 'Email mis a jour. Un nouvel email de verification a ete envoye.' };
    if (process.env.NODE_ENV !== 'production' && (process.env.EMAIL_PROVIDER || 'brevo').toLowerCase() === 'mock') {
      response.devVerificationToken = plainToken;
    }

    return res.json(response);
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
    const email = normalizeEmail(req.body.email);
    const student = await prisma.student.findUnique({ where: { email } });

    const genericResponse = { message: 'Si cet email existe, un code de reinitialisation a ete envoye par email.' };

    if (!student) {
      return res.json(genericResponse);
    }

    const latest = await prisma.passwordResetCode.findFirst({
      where: {
        studentId: student.id,
        email,
        usedAt: null
      },
      orderBy: { createdAt: 'desc' }
    });

    const now = new Date();
    if (latest && (now.getTime() - new Date(latest.createdAt).getTime()) / 1000 < OTP_COOLDOWN_SECONDS) {
      return res.status(429).json({ message: 'Veuillez patienter avant de demander un nouveau code.' });
    }

    const code = generateOtpCode();
    const codeHash = hashResetCode(email, code);
    const expiresAt = new Date(now.getTime() + OTP_EXPIRES_MINUTES * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.passwordResetCode.updateMany({
        where: { studentId: student.id, usedAt: null },
        data: { usedAt: now }
      });

      await tx.passwordResetCode.create({
        data: {
          studentId: student.id,
          phone: null,
          email,
          codeHash,
          expiresAt
        }
      });
    });

    const subject = 'Code de reinitialisation LinkEduPro';
    const text = `LinkEduPro: votre code de reinitialisation est ${code}. Expire dans ${OTP_EXPIRES_MINUTES} min.`;
    const html = `<p>LinkEduPro: votre code de reinitialisation est <strong>${code}</strong>.</p><p>Expire dans ${OTP_EXPIRES_MINUTES} minutes.</p>`;
    try {
      await sendEmail({ to: email, subject, html, text });
    } catch (mailError) {
      console.error('Password reset email send failed:', mailError);
      return res.status(503).json({
        message: "Service email indisponible pour le moment. Reessayez plus tard.",
        code: 'EMAIL_SERVICE_UNAVAILABLE'
      });
    }

    if (process.env.NODE_ENV !== 'production' && (process.env.EMAIL_PROVIDER || 'brevo').toLowerCase() === 'mock') {
      return res.json({ ...genericResponse, devCode: code });
    }

    return res.json(genericResponse);
  } catch (error) {
    return next(error);
  }
}

async function verifyResetCode(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const code = req.body.code.trim();

    const reset = await prisma.passwordResetCode.findFirst({
      where: { email, usedAt: null },
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

    const matches = hashResetCode(email, code) === reset.codeHash;
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
    const email = normalizeEmail(req.body.email);
    const code = req.body.code.trim();
    const newPassword = req.body.newPassword;

    const reset = await prisma.passwordResetCode.findFirst({
      where: { email, usedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    if (!reset || reset.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Code invalide ou expire.' });
    }

    if (reset.attempts >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ message: 'Trop de tentatives. Demandez un nouveau code.' });
    }

    const matches = hashResetCode(email, code) === reset.codeHash;
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
  verifyEmail,
  verifyEmailByLink,
  resendVerificationEmail,
  updateUnverifiedEmail,
  requestPasswordReset,
  verifyResetCode,
  resetPasswordWithCode
};
