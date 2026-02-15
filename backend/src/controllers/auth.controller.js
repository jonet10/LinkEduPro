const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { generateToken } = require('../utils/token');

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
        passwordHash
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

module.exports = { register, login };
