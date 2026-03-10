const prisma = require('../config/prisma');
const Joi = require('joi');
const path = require('path');
const fs = require('fs');
const { resolveStoragePath } = require('../config/storage');

const inputSchema = Joi.object({
  level: Joi.string().trim().required(),
  subject: Joi.string().trim().min(2).max(120).required(),
  topic: Joi.string().trim().min(2).max(200).allow('', null).optional()
});

function normalizeAcademicLevel(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return '';
  if (raw === '9E' || raw === 'LEVEL_9E') return 'LEVEL_9E';
  if (raw === 'NS1' || raw === 'NSI') return 'NSI';
  if (raw === 'NS2' || raw === 'NSII') return 'NSII';
  if (raw === 'NS3' || raw === 'NSIII') return 'NSIII';
  if (raw === 'NS4' || raw === 'NSIV' || raw === 'TERMINALE') return 'NSIV';
  if (raw === 'UNIVERSITE' || raw === 'UNIVERSITAIRE') return 'UNIVERSITAIRE';
  return '';
}

function normalizeNoAccent(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toSafeSegment(value) {
  return normalizeNoAccent(value).replace(/\s+/g, '_').replace(/_+/g, '_') || 'General';
}

function topicFromFileName(fileName) {
  return normalizeNoAccent(String(fileName || '').replace(/\.pdf$/i, '')).trim() || 'Sujet';
}

function buildStoredName({ level, subject, originalName }) {
  const ext = path.extname(originalName || '').toLowerCase() || '.pdf';
  const base = path.basename(originalName || 'document.pdf', ext);
  const safeBase = toSafeSegment(base);
  const safeSubject = toSafeSegment(subject);
  const name = `${level}_${safeSubject}_${safeBase}${ext}`;
  // Keep filenames reasonable (Windows + storage compatibility).
  return name.length <= 220 ? name : `${level}_${safeSubject}_${safeBase.slice(0, 120)}${ext}`;
}

function ensureUniquePath(dir, desiredName) {
  const ext = path.extname(desiredName);
  const base = path.basename(desiredName, ext);
  let candidate = desiredName;
  let counter = 2;
  while (fs.existsSync(path.join(dir, candidate))) {
    candidate = `${base}_${counter}${ext}`;
    counter += 1;
    if (counter > 200) {
      throw new Error('Impossible de générer un nom de fichier unique.');
    }
  }
  return candidate;
}

async function createExamSource(req, res, next) {
  try {
    if (!req.file?.filename) {
      return res.status(400).json({ message: 'Fichier PDF requis.' });
    }

    const { error, value } = inputSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    if (error) {
      return res.status(400).json({ message: 'Validation error', details: error.details.map((d) => d.message) });
    }

    const level = normalizeAcademicLevel(value.level);
    if (!level) {
      return res.status(400).json({ message: 'Niveau invalide.' });
    }

    const subject = String(value.subject || '').trim();
    const topic = String(value.topic || '').trim() || topicFromFileName(req.file.originalname);

    const targetDir = resolveStoragePath('exam-pdfs');
    const uploadedPath = path.join(targetDir, req.file.filename);

    // Ensure the stored filename carries level + subject to keep disk fallback consistent.
    const desiredName = buildStoredName({ level, subject, originalName: req.file.originalname || req.file.filename });
    const finalName = ensureUniquePath(targetDir, desiredName);
    const finalPath = path.join(targetDir, finalName);
    if (uploadedPath !== finalPath) {
      try {
        fs.renameSync(uploadedPath, finalPath);
      } catch (_) {
        // If rename fails (cross-device), fallback to copy + unlink.
        fs.copyFileSync(uploadedPath, finalPath);
        fs.unlinkSync(uploadedPath);
      }
    }

    const created = await prisma.probable_exercise_sources.upsert({
      where: {
        subject_topic_file_name_level: {
          subject,
          topic,
          file_name: finalName,
          level
        }
      },
      update: {},
      create: {
        level,
        subject,
        topic,
        file_name: finalName
      }
    });

    return res.status(201).json({
      message: 'Examen ajouté.',
      source: {
        id: created.id,
        level,
        subject,
        topic,
        fileName: finalName,
        url: `/api/public/exam-pdfs/${encodeURIComponent(finalName)}`
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { createExamSource };

