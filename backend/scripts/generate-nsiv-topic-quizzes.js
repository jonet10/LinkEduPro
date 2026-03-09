require('dotenv').config();
const fs = require('fs');
const path = require('path');

const ROOT_NSIV_DIR = path.resolve(__dirname, '../../EXAMENS/NSIV');
const OUTPUT_DIR = path.resolve(__dirname, '../data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'generated-nsiv-topic-quizzes.json');
const REPORT_FILE = path.join(OUTPUT_DIR, 'generated-nsiv-topic-report.json');

const STOP_WORDS = new Set([
  'nsiv', 'ns4', 'ns', 'svt', 'smp', 'ses', 'lla', 'bac', 'bacc', 'copy', 'pdf', 'doc', 'docx',
  'secondaire', 'annale', 'annales', 'quiz', 'theme', 'corrige', 'questionnaire', 'modele', 'examen',
  'juillet', 'juin', 'aout', 'fevrier', 'janvier', 'mars', 'avril', 'mai', 'septembre', 'octobre',
  'novembre', 'decembre'
]);

const SUBJECT_ALIASES = {
  'geo-histoire': 'Histoire-Geo',
  'histoire-geo': 'Histoire-Geo',
  'philosophie': 'Philosophie',
  'physique': 'Physique',
  'chimie': 'Chimie',
  'mathematiques': 'Mathematiques',
  'economie': 'Economie',
  'espagnol': 'Espagnol',
  'anglais': 'Anglais',
  'arts': 'Arts',
  'informatique': 'Informatique',
  'kreyol': 'Kreyol',
  'svt': 'SVT'
};

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function toKey(value) {
  return normalize(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toSubjectLabel(folderName) {
  const key = toKey(folderName);
  return SUBJECT_ALIASES[key] || normalize(folderName).replace(/[^a-zA-Z0-9 -]/g, '').trim() || 'General';
}

function extractYear(fileName) {
  const found = String(fileName || '').match(/(19\d{2}|20\d{2})/);
  return found ? Number(found[1]) : null;
}

function cleanTopic(fileName, subject) {
  const base = normalize(fileName).replace(/\.[^.]+$/, '');
  const lowered = base.toLowerCase();
  const subjectKey = toKey(subject).replace(/-/g, '');

  const rawTokens = lowered
    .replace(/[_(),.]+/g, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const tokens = rawTokens.filter((token) => {
    if (/^\d{2,4}$/.test(token)) return false;
    if (STOP_WORDS.has(token)) return false;
    if (subjectKey && token.replace(/[^a-z0-9]/g, '') === subjectKey) return false;
    if (token.length <= 2) return false;
    return true;
  });

  const topic = tokens.slice(0, 4).join(' ').trim();
  if (topic) return topic;
  return normalize(base).slice(0, 80);
}

function pickDistractors(allSubjects, subject) {
  const others = allSubjects.filter((item) => item !== subject);
  if (others.length <= 3) return others;
  const sorted = [...others].sort((a, b) => a.localeCompare(b));
  return [sorted[0], sorted[Math.floor(sorted.length / 2)], sorted[sorted.length - 1]];
}

function makeQuestion(subject, topic, years, score, optionsPool) {
  const options = [subject, ...pickDistractors(optionsPool, subject)].slice(0, 4);
  const shuffled = [...options].sort((a, b) => a.localeCompare(b));
  const correctOption = shuffled.findIndex((opt) => opt === subject);
  const yearsLabel = years.length ? years.join(', ') : 'non precisee';

  return {
    prompt: `Dans les annales NSIV, le theme "${topic}" appartient principalement a quelle matiere ?`,
    options: shuffled,
    correctOption,
    explanation: `Theme observe dans les sujets NSIV (${yearsLabel}) pour ${subject}.`,
    isPremium: true,
    frequencyScore: Math.max(55, Math.min(99, score)),
    sourceTopic: topic
  };
}

function walkFiles(rootDir) {
  const out = [];
  const stack = [rootDir];
  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile() && /\.(pdf|docx|doc)$/i.test(entry.name)) {
        out.push(full);
      }
    }
  }
  return out;
}

function buildPack() {
  if (!fs.existsSync(ROOT_NSIV_DIR)) {
    throw new Error(`Dossier NSIV introuvable: ${ROOT_NSIV_DIR}`);
  }

  const subjectDirs = fs.readdirSync(ROOT_NSIV_DIR, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  const subjects = [];

  for (const dir of subjectDirs) {
    const subject = toSubjectLabel(dir.name);
    const files = walkFiles(path.join(ROOT_NSIV_DIR, dir.name));
    const topics = new Map();

    for (const filePath of files) {
      const fileName = path.basename(filePath);
      const topic = cleanTopic(fileName, subject);
      const year = extractYear(fileName);
      const key = toKey(topic);
      if (!key) continue;

      if (!topics.has(key)) {
        topics.set(key, {
          topic,
          count: 0,
          years: new Set()
        });
      }
      const row = topics.get(key);
      row.count += 1;
      if (year) row.years.add(year);
    }

    const sortedTopics = Array.from(topics.values())
      .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic))
      .slice(0, 24);

    subjects.push({
      name: subject,
      description: `Quiz NSIV genere automatiquement depuis EXAMENS/NSIV (${dir.name}).`,
      topicRows: sortedTopics
    });
  }

  const subjectNames = subjects.map((s) => s.name).sort((a, b) => a.localeCompare(b));
  const pack = subjects
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((subject) => ({
      name: subject.name,
      description: subject.description,
      questions: subject.topicRows.map((row) =>
        makeQuestion(
          subject.name,
          row.topic,
          Array.from(row.years).sort((a, b) => b - a),
          50 + row.count * 7,
          subjectNames
        )
      )
    }));

  return {
    generatedAt: new Date().toISOString(),
    sourceRoot: ROOT_NSIV_DIR,
    subjectCount: pack.length,
    questionCount: pack.reduce((sum, s) => sum + s.questions.length, 0),
    pack
  };
}

function main() {
  const result = buildPack();
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result.pack, null, 2), 'utf8');
  fs.writeFileSync(REPORT_FILE, JSON.stringify(result, null, 2), 'utf8');

  console.log(`Pack genere: ${OUTPUT_FILE}`);
  console.log(`Rapport genere: ${REPORT_FILE}`);
  console.log(`Matieres: ${result.subjectCount}`);
  console.log(`Questions generees: ${result.questionCount}`);
}

main();
