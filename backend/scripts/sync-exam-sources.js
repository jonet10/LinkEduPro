require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
  return `${level}_${safeSubject}_${safeBase}${ext}`;
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
}

async function main() {
  if (!fs.existsSync(ROOT_EXAMS_DIR)) {
    throw new Error(`Dossier EXAMENS introuvable: ${ROOT_EXAMS_DIR}`);
  }
  if (!fs.existsSync(TARGET_PDF_DIR)) {
    fs.mkdirSync(TARGET_PDF_DIR, { recursive: true });
  }

  const levelDirs = fs.readdirSync(ROOT_EXAMS_DIR, { withFileTypes: true }).filter((entry) => entry.isDirectory());
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

      await upsertSource({
        level,
        subject,
        topic: formatTopicFromFileName(originalFileName),
        fileName: targetName
      });
      linked += 1;
    }
  }

  console.log(`EXAMENS scannes: ${scanned}`);
  console.log(`PDF copies vers backend/exam-pdfs: ${copied}`);
  console.log(`PDF uploades vers storage: ${uploaded}`);
  console.log(`Sources liees (probable_exercise_sources): ${linked}`);
  console.log(`PDF ignores par filtre: ${ignoredByFilter}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
