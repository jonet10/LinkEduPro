const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { generateToken } = require('../utils/token');
const { toApiLevel } = require('../v2/utils/level');

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

module.exports = { register, login, acceptTeacherInvite, validateTeacherInvite };
