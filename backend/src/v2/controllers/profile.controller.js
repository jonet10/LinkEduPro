const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const { toApiLevel } = require('../utils/level');
const ACADEMIC_LEVEL_TO_API = {
  LEVEL_9E: '9e',
  NSI: 'NSI',
  NSII: 'NSII',
  NSIII: 'NSIII',
  NSIV: 'NSIV',
  UNIVERSITAIRE: 'Universitaire'
};
const ACADEMIC_LEVEL_TO_DB = {
  '9e': 'LEVEL_9E',
  nsi: 'NSI',
  nsii: 'NSII',
  nsiii: 'NSIII',
  nsiv: 'NSIV',
  universitaire: 'UNIVERSITAIRE'
};

function parseAcademicLevel(value) {
  if (typeof value !== 'string') return null;
  return ACADEMIC_LEVEL_TO_DB[value.trim().toLowerCase()] || null;
}

function startOfTodayServerTime() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toProfile(student) {
  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email,
    phone: student.phone,
    address: student.address,
    role: student.role,
    level: student.studentProfile ? ACADEMIC_LEVEL_TO_API[student.studentProfile.level] : toApiLevel(student.level),
    photoUrl: student.photoUrl,
    darkMode: student.darkMode,
    school: student.school,
    gradeLevel: student.gradeLevel
  };
}

async function getMyProfile(req, res, next) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.user.id },
      include: { studentProfile: true }
    });

    if (!student) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    return res.json({ profile: toProfile(student) });
  } catch (error) {
    return next(error);
  }
}

async function updateMyProfile(req, res, next) {
  try {
    const { phone, email, address, password, level } = req.body;

    const existing = await prisma.student.findUnique({
      where: { id: req.user.id },
      include: { studentProfile: true }
    });
    if (!existing) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    const data = {};

    if (phone !== undefined) {
      data.phone = phone || null;
    }

    if (email !== undefined) {
      const normalizedEmail = email || null;
      if (normalizedEmail && normalizedEmail !== existing.email) {
        const used = await prisma.student.findUnique({ where: { email: normalizedEmail } });
        if (used && used.id !== existing.id) {
          return res.status(409).json({ message: 'Email deja utilise.' });
        }
      }
      data.email = normalizedEmail;
    }

    if (address !== undefined) {
      data.address = address || null;
    }

    if (password !== undefined) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    let desiredAcademicLevel = null;
    if (level !== undefined) {
      if (existing.role !== 'STUDENT') {
        return res.status(400).json({ message: 'Niveau academique reserve aux eleves.' });
      }

      desiredAcademicLevel = parseAcademicLevel(level);
      if (!desiredAcademicLevel) {
        return res.status(400).json({ message: 'Niveau invalide.' });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.student.update({
        where: { id: existing.id },
        data
      });

      if (desiredAcademicLevel) {
        await tx.studentProfile.upsert({
          where: { userId: existing.id },
          create: { userId: existing.id, level: desiredAcademicLevel },
          update: { level: desiredAcademicLevel }
        });
      }

      return tx.student.findUnique({
        where: { id: existing.id },
        include: { studentProfile: true }
      });
    });

    return res.json({ message: 'Profil mis a jour.', profile: toProfile(updated) });
  } catch (error) {
    return next(error);
  }
}

async function uploadMyPhoto(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucun fichier envoye.' });
    }

    const photoUrl = `/storage/profile-photos/${req.file.filename}`;
    const updated = await prisma.student.update({
      where: { id: req.user.id },
      data: { photoUrl }
    });

    return res.status(201).json({
      message: 'Photo de profil mise a jour.',
      photoUrl: updated.photoUrl,
      profile: toProfile(updated)
    });
  } catch (error) {
    return next(error);
  }
}

async function setDarkMode(req, res, next) {
  try {
    const updated = await prisma.student.update({
      where: { id: req.user.id },
      data: { darkMode: req.body.darkMode }
    });

    return res.json({
      message: 'Preference de theme mise a jour.',
      darkMode: updated.darkMode,
      profile: toProfile(updated)
    });
  } catch (error) {
    return next(error);
  }
}

async function getDailyWelcomePopup(req, res, next) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        firstName: true,
        dateOfBirth: true,
        lastWelcomePopupDate: true,
        usedWelcomeMessageIds: true
      }
    });

    if (!student) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }

    if (!student.dateOfBirth) {
      return res.json({ shouldShow: false });
    }

    const today = startOfTodayServerTime();
    if (student.lastWelcomePopupDate && isSameDay(new Date(student.lastWelcomePopupDate), today)) {
      return res.json({ shouldShow: false });
    }

    const allMessages = await prisma.welcomeMessage.findMany({
      select: { id: true, text: true, category: true },
      orderBy: { id: 'asc' }
    });

    if (!allMessages.length) {
      return res.json({ shouldShow: false });
    }

    let usedIds = Array.isArray(student.usedWelcomeMessageIds)
      ? student.usedWelcomeMessageIds.map((id) => Number(id)).filter((id) => Number.isInteger(id))
      : [];

    let unusedMessages = allMessages.filter((m) => !usedIds.includes(m.id));
    if (!unusedMessages.length) {
      usedIds = [];
      unusedMessages = allMessages;
    }

    const chosen = unusedMessages[Math.floor(Math.random() * unusedMessages.length)];
    const nextUsedIds = [...usedIds, chosen.id];
    const msInDay = 1000 * 60 * 60 * 24;
    const daysLived = Math.floor((today.getTime() - new Date(student.dateOfBirth).getTime()) / msInDay);

    await prisma.student.update({
      where: { id: student.id },
      data: {
        lastWelcomePopupDate: today,
        usedWelcomeMessageIds: nextUsedIds
      }
    });

    return res.json({
      shouldShow: true,
      firstName: student.firstName,
      daysLived,
      message: chosen
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMyProfile,
  updateMyProfile,
  uploadMyPhoto,
  setDarkMode,
  getDailyWelcomePopup
};
