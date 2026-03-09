require('dotenv').config();
const fs = require('fs');
const path = require('path');

const ROOT_NSIV_DIR = path.resolve(__dirname, '../../EXAMENS/NSIV');
const OUTPUT_DIR = path.resolve(__dirname, '../data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'generated-nsiv-topic-quizzes.json');
const REPORT_FILE = path.join(OUTPUT_DIR, 'generated-nsiv-topic-report.json');
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png']);

const STOP_WORDS = new Set([
  'nsiv', 'ns4', 'ns', 'svt', 'smp', 'ses', 'lla', 'lls', 'smo', 'bac', 'bacc', 'copy', 'pdf', 'doc', 'docx',
  'secondaire', 'annale', 'annales', 'quiz', 'theme', 'corrige', 'questionnaire', 'modele', 'examen',
  'juillet', 'juin', 'aout', 'fevrier', 'janvier', 'mars', 'avril', 'mai', 'septembre', 'octobre',
  'novembre', 'decembre', 'tous', 'sujet', 'version', 'v', 'sr', 'ns'
]);

const SUBJECT_CONFIG = {
  Anglais: {
    patterns: [
      { label: 'Vocabulary', regex: /(vocab|word|speech|declaim|text|reading|comprehension|grammar|verb|tense|according|country|business|currently|sometimes|decide|frozen|appoint|peaceful|trustful|faithful|cheerful|optimistic|positive|unbelievable)/ }
    ],
    fallbackTopics: ['Vocabulary', 'Reading comprehension', 'Grammar and tenses', 'Written expression']
  },
  Arts: {
    patterns: [
      { label: 'Folklore', regex: /(folklore|yanvalou|rara|compas|tambour|carnaval)/ },
      { label: 'Peinture', regex: /(peinture|artisan|saint soleil|tiga)/ },
      { label: 'Musique et theatre', regex: /(mozart|chopin|violon|melodie|theatre|theatre)/ }
    ],
    fallbackTopics: ['Folklore', 'Peinture', 'Musique et theatre', 'Patrimoine culturel']
  },
  Chimie: {
    patterns: [
      { label: 'Acides et bases', regex: /(acide|base|redox|oxyd)/ },
      { label: 'Hydrocarbures', regex: /(hydrocarb|carbure|propene|propanone)/ },
      { label: 'Fonctions organiques', regex: /(alcool|ethanol|aldehyde|amidon|lipide|organique|ester|acetate)/ },
      { label: 'Structure de la matiere', regex: /(atome|ion|mole|molaire|liaison|molecule|isomere|sodium)/ }
    ],
    fallbackTopics: ['Acides et bases', 'Hydrocarbures', 'Fonctions organiques', 'Structure de la matiere']
  },
  Economie: {
    patterns: [
      { label: 'Croissance et developpement', regex: /(croissance|developpement|marginal|lucas|rostov|debreu)/ },
      { label: 'Menages et epargne', regex: /(menage|epargne|recette|budget|investissement|consomm)/ },
      { label: 'Monnaie et inflation', regex: /(monnaie|inflation|elasticite|mercantilisme)/ }
    ],
    fallbackTopics: ['Croissance et developpement', 'Menages et epargne', 'Monnaie et inflation', 'Politiques economiques']
  },
  Espagnol: {
    patterns: [
      { label: 'Vocabulario y comprension', regex: /(espanol|escap|entonces|intelectual|necesario|renunciar|impacto|naturales|indicado|derecho|principios|describa|recogida|vivienda|alegremente|confiado|increible|leal|optimista|tranquilamente)/ },
      { label: 'Lectura y expresion', regex: /(managua|montevideo|nicaragua|paramaribo|asuncion|brasilia|san juan|san salvador|belmopan|mexico|pacifico)/ }
    ],
    fallbackTopics: ['Vocabulario y comprension', 'Lectura y expresion', 'Gramatica espanola', 'Produccion escrita']
  },
  'Histoire-Geo': {
    patterns: [
      { label: 'Population et demographie', regex: /(population|accroissement|demograph)/ },
      { label: 'Croissance et economie', regex: /(economie|croissance|capital|agraire|developpement)/ },
      { label: 'Espaces et climat', regex: /(continent|climat|climatologie|geodesie|oceanographie|edaphique)/ },
      { label: 'Histoire nationale', regex: /(dessalines|revolution|boukman|boisrond|marie jeanne|sanite|sans soucis|stenio)/ }
    ],
    fallbackTopics: ['Population et demographie', 'Croissance et economie', 'Espaces et climat', 'Histoire nationale']
  },
  Informatique: {
    patterns: [
      { label: 'Algorithmique', regex: /(algorith|logique|pseudo|programm)/ },
      { label: 'Systemes et reseaux', regex: /(systeme|reseau|machine|ordinateur|internet)/ }
    ],
    fallbackTopics: ['Algorithmique', 'Systemes et reseaux', 'Programmation', 'Bases de donnees']
  },
  Kreyol: {
    patterns: [
      { label: 'Lekti ak konpreyansyon', regex: /(komanse|koresponn|reflechi|lanati|travay|pwoteje|respekte|antoloji|konfyans|lakay|lakou|lodyanse|matoman|tabatye|potorik|kotof|vwyaj|krich|tizon|pankat|patizan|pistach|ayiti|rabonnen)/ },
      { label: 'Ekriti kreyol', regex: /(kreyol|kretol|gram|ekriti|pwodiksyon)/ }
    ],
    fallbackTopics: ['Lekti ak konpreyansyon', 'Ekriti kreyol', 'Vokabiler', 'Kominikasyon']
  },
  Mathematiques: {
    patterns: [
      { label: 'Fonctions', regex: /(fonction|graphique|limite|secante)/ },
      { label: 'Geometrie analytique', regex: /(analytique|cartesien|orthogonal|geometrique)/ },
      { label: 'Algebre et calcul', regex: /(rationnel|complexe|numerique|parametre|matrice|aleatoire)/ }
    ],
    fallbackTopics: ['Fonctions', 'Geometrie analytique', 'Algebre et calcul', 'Statistiques']
  },
  Philosophie: {
    patterns: [
      { label: 'Connaissance et raison', regex: /(connaissance|logique|epistem|raison|objectif|progression|progressif)/ },
      { label: 'Ethique et culture', regex: /(ethique|culture|religion|humanite|nature|esthetique)/ },
      { label: 'Philosophes classiques', regex: /(platon|socrate|kant|marx|rousseau|voltaire|descartes|hobbes|spinoza|arendt|montesquieu)/ },
      { label: 'Metaphysique', regex: /(metaphysique|apologie|anthropologie|intangible)/ }
    ],
    fallbackTopics: ['Connaissance et raison', 'Ethique et culture', 'Philosophes classiques', 'Metaphysique']
  },
  Physique: {
    patterns: [
      { label: 'Mecanique', regex: /(mecanique|vitesse|balistique|gravite|tangente)/ },
      { label: 'Electricite et magnetisme', regex: /(electromagnet|induction|condensateur|transformateur|aimant|bobine|armature|charpak)/ },
      { label: 'Ondes et lumiere', regex: /(onde|lumiere|quanta|plasma|entropie|schrodinger|wineland|becquerel)/ }
    ],
    fallbackTopics: ['Mecanique', 'Electricite et magnetisme', 'Ondes et lumiere', 'Cosmologie']
  },
  SVT: {
    patterns: [
      { label: 'Genetique et heredite', regex: /(genetique|polym|homozygote|anticorps|gamete|chromo)/ },
      { label: 'Cytologie et anatomie', regex: /(cytologie|cytoplasme|anatomie|histologie|neurone|cardiaque|physiologie)/ },
      { label: 'Geologie', regex: /(geologie|gisement|seisme|paleontologie|morphologie|microbiologie|zoologie|virologie)/ }
    ],
    fallbackTopics: ['Genetique et heredite', 'Cytologie et anatomie', 'Geologie', 'Ecologie']
  }
};

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

function normalizeTopicLabel(value) {
  const cleaned = normalize(value)
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'Theme general';
}

function cleanTokens(fileName, subject) {
  const base = normalize(fileName).replace(/\.[^.]+$/, '');
  const lowered = base.toLowerCase().replace(/['"]/g, '');
  const subjectTokens = toKey(subject).split('-').filter(Boolean);

  return lowered
    .replace(/[_(),.]+/g, ' ')
    .replace(/-/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function cleanTopic(fileName, subject) {
  const subjectTokens = toKey(subject).split('-').filter(Boolean);
  const tokens = cleanTokens(fileName, subject).filter((token) => {
    if (/^\d{2,4}$/.test(token)) return false;
    if (STOP_WORDS.has(token)) return false;
    if (subjectTokens.includes(token)) return false;
    if (token.length <= 2) return false;
    return true;
  });

  const topic = tokens.slice(0, 5).join(' ').trim();
  if (topic) return topic;
  return normalize(fileName).replace(/\.[^.]+$/, '').slice(0, 80);
}

function detectTopicLabels(subject, fileName) {
  const config = SUBJECT_CONFIG[subject] || { patterns: [], fallbackTopics: [] };
  const lowered = normalize(fileName).toLowerCase();
  const fromTokens = cleanTopic(fileName, subject);
  const searchText = `${lowered} ${fromTokens}`.toLowerCase();
  const matches = [];
  for (const row of config.patterns) {
    if (row.regex.test(searchText)) {
      matches.push(row.label);
    }
  }
  return matches;
}

function keepTopic(subject, topic, count) {
  const key = String(topic || '').toLowerCase();
  if (!key || key.length < 4) return false;
  if (STOP_WORDS.has(key)) return false;
  return Number(count || 0) >= 1;
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
      } else if (entry.isFile() && ALLOWED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        out.push(full);
      }
    }
  }
  return out;
}

function detectTrack(fileName) {
  const lower = normalize(fileName).toLowerCase();
  if (lower.includes('smp') && lower.includes('svt')) return 'SMP-SVT';
  if (lower.includes('ses')) return 'SES';
  if (lower.includes('lla') || lower.includes('lls')) return 'LLA';
  if (lower.includes('svt')) return 'SVT';
  if (lower.includes('smp')) return 'SMP';
  return 'General';
}

function collectAudit(rootDir, fileRows) {
  const suspicious = [];
  const bySize = new Map();
  const extStats = {};

  for (const row of fileRows) {
    const ext = path.extname(row.fileName).toLowerCase() || 'none';
    extStats[ext] = (extStats[ext] || 0) + 1;
    const sizeKey = String(row.size || 0);
    if (!bySize.has(sizeKey)) bySize.set(sizeKey, []);
    bySize.get(sizeKey).push(row.filePath);

    if (/[()]/.test(row.fileName) || /\+/.test(row.fileName) || /\s{2,}/.test(row.fileName) || /_-\b/.test(row.fileName)) {
      suspicious.push(row.filePath);
    }
  }

  const duplicateBySize = Array.from(bySize.entries())
    .filter(([, items]) => items.length > 1)
    .slice(0, 40)
    .map(([size, items]) => ({ size: Number(size), files: items }));

  return {
    sourceRoot: rootDir,
    totalFiles: fileRows.length,
    extensionCounts: extStats,
    suspiciousFileNames: suspicious.slice(0, 120),
    duplicateBySize
  };
}

function buildPack() {
  if (!fs.existsSync(ROOT_NSIV_DIR)) {
    throw new Error(`Dossier NSIV introuvable: ${ROOT_NSIV_DIR}`);
  }

  const subjectDirs = fs.readdirSync(ROOT_NSIV_DIR, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  const subjects = [];
  const auditRows = [];

  for (const dir of subjectDirs) {
    const subject = toSubjectLabel(dir.name);
    const files = walkFiles(path.join(ROOT_NSIV_DIR, dir.name));
    const topics = new Map();
    const tracks = new Map();
    const yearsSeen = new Set();

    for (const filePath of files) {
      const fileName = path.basename(filePath);
      const year = extractYear(fileName);
      const detected = detectTopicLabels(subject, fileName);
      const track = detectTrack(fileName);
      tracks.set(track, (tracks.get(track) || 0) + 1);
      if (year) yearsSeen.add(year);

      auditRows.push({
        subject,
        filePath,
        fileName,
        size: fs.statSync(filePath).size
      });

      for (const topicLabelRaw of detected) {
        const topic = normalizeTopicLabel(topicLabelRaw);
        const key = toKey(topic);
        if (!key) continue;
        if (!topics.has(key)) {
          topics.set(key, { topic, count: 0, years: new Set(), tracks: new Set() });
        }
        const row = topics.get(key);
        row.count += 1;
        if (year) row.years.add(year);
        row.tracks.add(track);
      }
    }

    let sortedTopics = Array.from(topics.values())
      .filter((row) => keepTopic(subject, row.topic, row.count))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return b.count - a.count || a.topic.localeCompare(b.topic);
      })
      .slice(0, 24);

    const config = SUBJECT_CONFIG[subject] || { fallbackTopics: [] };
    if (sortedTopics.length < 4) {
      const fallbackYears = Array.from(yearsSeen).sort((a, b) => b - a).slice(0, 3);
      for (const fallbackTopic of config.fallbackTopics || []) {
        const key = toKey(fallbackTopic);
        if (topics.has(key)) continue;
        sortedTopics.push({
          topic: fallbackTopic,
          count: 1,
          years: new Set(fallbackYears),
          tracks: new Set(Array.from(tracks.keys()))
        });
      }
    }

    subjects.push({
      name: subject,
      description: `Quiz NSIV genere automatiquement depuis EXAMENS/NSIV (${dir.name}).`,
      topicRows: sortedTopics.slice(0, 16),
      trackStats: Array.from(tracks.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
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

  const audit = collectAudit(ROOT_NSIV_DIR, auditRows);

  return {
    generatedAt: new Date().toISOString(),
    sourceRoot: ROOT_NSIV_DIR,
    subjectCount: pack.length,
    questionCount: pack.reduce((sum, s) => sum + s.questions.length, 0),
    pack,
    audit
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
