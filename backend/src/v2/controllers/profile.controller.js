const bcrypt = require('bcryptjs');
const prisma = require('../../config/prisma');
const { normalizeLevelInput, toApiLevel } = require('../utils/level');

function toProfile(student) {
  return {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    email: student.email,
    phone: student.phone,
    address: student.address,
    role: student.role,
    level: toApiLevel(student.level),
    photoUrl: student.photoUrl,
    darkMode: student.darkMode,
    school: student.school,
    gradeLevel: student.gradeLevel
  };
}

async function getMyProfile(req, res, next) {
  try {
    const student = await prisma.student.findUnique({ where: { id: req.user.id } });

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

    const existing = await prisma.student.findUnique({ where: { id: req.user.id } });
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

    if (level !== undefined) {
      const parsed = normalizeLevelInput(level);
      if (!parsed) {
        return res.status(400).json({ message: 'Niveau invalide.' });
      }
      data.level = parsed;
    }

    const updated = await prisma.student.update({
      where: { id: existing.id },
      data
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

module.exports = {
  getMyProfile,
  updateMyProfile,
  uploadMyPhoto,
  setDarkMode
};
