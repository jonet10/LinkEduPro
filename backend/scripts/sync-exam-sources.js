require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const SKIP_DB = String(process.env.EXAMS_SKIP_DB || '').trim().toLowerCase() === 'true';
const prisma = SKIP_DB ? null : new PrismaClient();

const ROOT_EXAMS_DIR = path.resolve(
  __dirname,
  String(process.env.EXAMS_ROOT_DIR || '../../EXAMENS').trim()
);
const TARGET_PDF_DIR = path.resolve(__dirname, '../exam-pdfs');

const LEVEL_MAP = {
  NSIV: 'NSIV',
  NS4: 'NSIV',
  '9E': 'LEVEL_9E',
  '9EME': 'LEVEL_9E',
  NSI: 'NSI',
  NS1: 'NSI',
  NSII: 'NSII',
  NS2: 'NSII',
  NSIII: 'NSIII',
  NS3: 'NSIII'
};

function normalizeNoAccent(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeLevelFolder(folderName) {
  const key = normalizeNoAccent(folderName).replace(/\s+/g, '').toUpperCase();
  return LEVEL_MAP[key] || '';
}

function inferLevelFromFileName(fileName) {
  const raw = normalizeNoAccent(fileName).toUpperCase();
  if (!raw) return 'NSIV';

  if (/\b9\s*E\b/.test(raw) || raw.includes('9E') || raw.includes('9EME')) return 'LEVEL_9E';
  if (raw.includes('NSIII') || raw.includes('NS-3') || /\bNS\s*3\b/.test(raw)) return 'NSIII';
  if (raw.includes('NSII') || raw.includes('NS-2') || /\bNS\s*2\b/.test(raw)) return 'NSII';
  if (raw.includes('NSI') || raw.includes('NS-1') || /\bNS\s*1\b/.test(raw)) return 'NSI';
  if (raw.includes('NSIV') || raw.includes('NS-4') || /\bNS\s*4\b/.test(raw) || raw.includes('TERMINALE')) return 'NSIV';
  if (raw.includes('UNIVERSIT')) return 'UNIVERSITAIRE';

  return 'NSIV';
}

function normalizeKey(value) {
  return normalizeNoAccent(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseFilterSet(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  const items = value
    .split(',')
    .map((item) => normalizeKey(item))
    .filter(Boolean);
  return items.length ? new Set(items) : null;
}

const SUBJECT_KEYWORDS = [
  { subject: 'Mathématiques', keys: ['math', 'mathem', 'algebre', 'geometrie', 'trigo', 'analyse'] },
  { subject: 'Physique', keys: ['physique'] },
  { subject: 'Chimie', keys: ['chimie'] },
  { subject: 'Biologie', keys: ['biologie'] },
  { subject: 'SVT', keys: ['svt'] },
  { subject: 'Informatique', keys: ['informatique', 'info', 'programmation'] },
  { subject: 'Anglais', keys: ['anglais', 'english'] },
  { subject: 'Espagnol', keys: ['espagnol', 'espanol', 'spanish'] },
  { subject: 'Français', keys: ['francais', 'français', 'franc'] },
  { subject: 'Philosophie', keys: ['philosophie', 'philo'] },
  { subject: 'Histoire-Géographie', keys: ['histoire', 'geo', 'geographie', 'géographie', 'hist'] },
  { subject: 'Économie', keys: ['economie', 'économie'] },
  { subject: 'Art & Musique', keys: ['art', 'musique'] }
];

function inferSubjectFromFileName(fileName) {
  const normalized = normalizeNoAccent(fileName).toLowerCase();
  for (const entry of SUBJECT_KEYWORDS) {
    if (entry.keys.some((key) => normalized.includes(normalizeNoAccent(key).toLowerCase()))) {
      return entry.subject;
    }
  }
  const firstToken = normalizeNoAccent(fileName).split(' ').filter(Boolean)[0];
  return firstToken ? formatSubjectName(firstToken) : 'General';
}

function formatSubjectName(value) {
  const clean = normalizeNoAccent(value);
  return clean || 'General';
}

function formatTopicFromFileName(fileName) {
  const withoutExt = String(fileName || '').replace(/\.[^.]+$/, '');
  return normalizeNoAccent(withoutExt) || 'Sujet';
}

function buildStableTargetName(level, subject, originalFileName) {
  const ext = path.extname(originalFileName).toLowerCase();
  const base = path.basename(originalFileName, ext);
  const safeBase = normalizeNoAccent(base).replace(/\s+/g, '_');
  const safeSubject = normalizeNoAccent(subject).replace(/\s+/g, '_');
  const rawName = `${level}_${safeSubject}_${safeBase}${ext}`;
  // Keep deterministic names, but avoid Windows path length issues by trimming excessively long bases.
  if (rawName.length <= 220) return rawName;
  const hash = crypto.createHash('sha1').update(rawName).digest('hex').slice(0, 8);
  const trimmedBase = safeBase.slice(0, 120);
  return `${level}_${safeSubject}_${trimmedBase}_${hash}${ext}`;
}

function walkFilesRecursive(rootDir) {
  const out = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        out.push(fullPath);
      }
    }
  }
  return out;
}

function normalizeUploadBaseUrl(raw) {
  const value = String(raw || '').trim().replace(/\/+$/, '');
  if (!value) return '';
  if (!/^https?:\/\//i.test(value)) return '';
  return value;
}

async function uploadPdfIfEnabled({ filePath, targetName }) {
  const baseUrl = normalizeUploadBaseUrl(process.env.EXAMS_UPLOAD_BASE_URL);
  const token = String(process.env.EXAMS_UPLOAD_TOKEN || '').trim();
  if (!baseUrl || !token) return false;

  const url = `${baseUrl}/api/admin/exam-pdfs`;
  const buffer = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('file', new Blob([buffer], { type: 'application/pdf' }), targetName);

  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const error = new Error(`Upload PDF echoue (${response.status}) vers ${url}: ${body || 'Erreur inconnue.'}`);
    error.status = response.status;
    throw error;
  }

  return true;
}

async function upsertSource({ level, subject, topic, fileName }) {
  if (SKIP_DB) return false;
  await prisma.probable_exercise_sources.upsert({
    where: {
      subject_topic_file_name_level: {
        subject,
        topic,
        file_name: fileName,
        level
      }
    },
    update: {},
    create: {
      level,
      subject,
      topic,
      file_name: fileName
    }
  });
  return true;
}

async function main() {
  if (!fs.existsSync(ROOT_EXAMS_DIR)) {
    throw new Error(`Dossier EXAMENS introuvable: ${ROOT_EXAMS_DIR}`);
  }
  if (!fs.existsSync(TARGET_PDF_DIR)) {
    fs.mkdirSync(TARGET_PDF_DIR, { recursive: true });
  }

  if (SKIP_DB) {
    console.log('Mode EXAMS_SKIP_DB=true: copie PDF uniquement (pas de mise à jour DB).');
  }

  const levelDirs = fs.readdirSync(ROOT_EXAMS_DIR, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  const rootPdfFiles = fs.readdirSync(ROOT_EXAMS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.pdf$/i.test(entry.name))
    .map((entry) => path.join(ROOT_EXAMS_DIR, entry.name));
  const levelFilter = parseFilterSet(process.env.EXAMS_LEVEL_FILTER);
  const subjectFilter = parseFilterSet(process.env.EXAMS_SUBJECT_FILTER);
  let scanned = 0;
  let copied = 0;
  let linked = 0;
  let ignoredByFilter = 0;
  let uploaded = 0;

  if (levelFilter) {
    console.log(`Filtre niveaux actif: ${Array.from(levelFilter.values()).join(', ')}`);
  }
  if (subjectFilter) {
    console.log(`Filtre matieres actif: ${Array.from(subjectFilter.values()).join(', ')}`);
  }
  if (normalizeUploadBaseUrl(process.env.EXAMS_UPLOAD_BASE_URL) && String(process.env.EXAMS_UPLOAD_TOKEN || '').trim()) {
    console.log('Upload vers backend actif: EXAMS_UPLOAD_BASE_URL + EXAMS_UPLOAD_TOKEN');
  }

  for (const levelEntry of levelDirs) {
    const level = normalizeLevelFolder(levelEntry.name);
    if (!level) continue;
    if (levelFilter && !levelFilter.has(normalizeKey(level)) && !levelFilter.has(normalizeKey(levelEntry.name))) {
      continue;
    }

    const levelDir = path.join(ROOT_EXAMS_DIR, levelEntry.name);
    const files = walkFilesRecursive(levelDir).filter((filePath) => /\.pdf$/i.test(filePath));

    for (const filePath of files) {
      scanned += 1;
      const relative = path.relative(levelDir, filePath);
      const parts = relative.split(path.sep).filter(Boolean);
      const subject = formatSubjectName(parts.length > 1 ? parts[0] : 'General');
      if (subjectFilter && !subjectFilter.has(normalizeKey(subject))) {
        ignoredByFilter += 1;
        continue;
      }
      const originalFileName = path.basename(filePath);
      const targetName = buildStableTargetName(level, subject, originalFileName);
      const targetPath = path.join(TARGET_PDF_DIR, targetName);

      if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(filePath, targetPath);
        copied += 1;
      }

      const didUpload = await uploadPdfIfEnabled({ filePath, targetName });
      if (didUpload) uploaded += 1;

      const didUpsert = await upsertSource({
        level,
        subject,
        topic: formatTopicFromFileName(originalFileName),
        fileName: targetName
      });
      if (didUpsert) linked += 1;
    }
  }

  // Also ingest PDFs placed directly under the EXAMENS root.
  for (const filePath of rootPdfFiles) {
    scanned += 1;
    const originalFileName = path.basename(filePath);
    const level = inferLevelFromFileName(originalFileName);
    if (levelFilter && !levelFilter.has(normalizeKey(level))) {
      continue;
    }

    const subject = inferSubjectFromFileName(originalFileName);
    if (subjectFilter && !subjectFilter.has(normalizeKey(subject))) {
      ignoredByFilter += 1;
      continue;
    }

    const targetName = buildStableTargetName(level, subject, originalFileName);
    const targetPath = path.join(TARGET_PDF_DIR, targetName);

    if (!fs.existsSync(targetPath)) {
      fs.copyFileSync(filePath, targetPath);
      copied += 1;
    }

    const didUpload = await uploadPdfIfEnabled({ filePath, targetName });
    if (didUpload) uploaded += 1;

    const didUpsert = await upsertSource({
      level,
      subject,
      topic: formatTopicFromFileName(originalFileName),
      fileName: targetName
    });
    if (didUpsert) linked += 1;
  }

  console.log(`EXAMENS scannes: ${scanned}`);
  console.log(`PDF copies vers backend/exam-pdfs: ${copied}`);
  console.log(`PDF uploades vers storage: ${uploaded}`);
  console.log(`Sources liees (probable_exercise_sources): ${linked}${SKIP_DB ? ' (SKIP_DB)' : ''}`);
  console.log(`PDF ignores par filtre: ${ignoredByFilter}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    if (prisma) await prisma.$disconnect();
  });
