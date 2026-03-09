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
  const yearsLabel = years.length ? years.join(', ') : 'non precisee';
  const base = makePedagogicalQuestion(subject, topic);

  return {
    prompt: base.prompt,
    options: base.options,
    correctOption: base.correctOption,
    explanation: `${base.explanation} (annales observees: ${yearsLabel}).`,
    isPremium: true,
    frequencyScore: Math.max(55, Math.min(99, score)),
    sourceTopic: topic
  };
}

function makePedagogicalQuestion(subject, topic) {
  const key = toKey(topic);
  const templates = {
    vocabulary: {
      prompt: 'En anglais, quel est le meilleur reflexe pour apprendre durablement du vocabulaire ?',
      options: ['Memoriser des mots isoles sans contexte', 'Apprendre les mots dans des phrases et les reutiliser', 'Eviter toute revision', 'Traduire mot a mot sans pratiquer'],
      correctOption: 1,
      explanation: 'Le contexte et la reutilisation active ameliorent la retention du vocabulaire.'
    },
    'reading-comprehension': {
      prompt: 'Quelle strategie aide le plus en reading comprehension ?',
      options: ['Lire uniquement le titre', 'Sauter les connecteurs logiques', 'Identifier idee principale, details et inferer', 'Repondre sans relire le texte'],
      correctOption: 2,
      explanation: 'Une lecture structuree (idee principale, details, inferrence) augmente la precision.'
    },
    'grammar-and-tenses': {
      prompt: 'En anglais, le choix du temps verbal depend surtout de :',
      options: ['La longueur de la phrase', 'La couleur du mot', 'Le contexte temporel et l intention', 'Le hasard'],
      correctOption: 2,
      explanation: 'Le contexte et l intention de communication determinent le temps verbal.'
    },
    'written-expression': {
      prompt: 'Pour une bonne production ecrite en anglais, il faut en priorite :',
      options: ['Empiler des mots compliques', 'Structurer introduction, developpement et conclusion', 'Eviter toute ponctuation', 'Copier une phrase connue'],
      correctOption: 1,
      explanation: 'La structure logique et la coherence sont essentielles en expression ecrite.'
    },
    folklore: {
      prompt: 'En arts, le folklore designe principalement :',
      options: ['Des traditions artistiques et culturelles populaires', 'Une formule mathematique', 'Un protocole de laboratoire', 'Un format de fichier'],
      correctOption: 0,
      explanation: 'Le folklore regroupe des pratiques culturelles transmises dans la communaute.'
    },
    peinture: {
      prompt: 'Quel element est fondamental dans l analyse d une oeuvre picturale ?',
      options: ['La composition, la couleur et la lumiere', 'Le prix du papier', 'Le nom du quartier', 'La vitesse de lecture'],
      correctOption: 0,
      explanation: 'Composition, couleur et lumiere sont des criteres centraux en peinture.'
    },
    'musique-et-theatre': {
      prompt: 'En arts de scene, une performance reussie repose d abord sur :',
      options: ['Improviser sans preparation', 'L articulation, le rythme et l expression', 'Ignorer le public', 'Parler le plus vite possible'],
      correctOption: 1,
      explanation: 'L articulation, le rythme et l expression soutiennent la qualite artistique.'
    },
    'patrimoine-culturel': {
      prompt: 'Le patrimoine culturel est important parce qu il :',
      options: ['Freine la creativite', 'Coupe les generations', 'Transmet identite, histoire et valeurs', 'Remplace toutes les disciplines'],
      correctOption: 2,
      explanation: 'Le patrimoine soutient la memoire collective et l identite culturelle.'
    },
    'acides-et-bases': {
      prompt: 'Un indicateur acido-basique sert principalement a :',
      options: ['Mesurer la masse molaire', 'Identifier le caractere acide ou basique d une solution', 'Calculer la vitesse', 'Mesurer une distance'],
      correctOption: 1,
      explanation: 'Un indicateur met en evidence la nature acide ou basique.'
    },
    hydrocarbures: {
      prompt: 'Les hydrocarbures sont des composes formes essentiellement de :',
      options: ['Sodium et chlore', 'Carbone et hydrogene', 'Oxygene et azote', 'Calcium et fer'],
      correctOption: 1,
      explanation: 'Un hydrocarbure est constitue principalement de carbone et hydrogene.'
    },
    'fonctions-organiques': {
      prompt: 'En chimie organique, une fonction sert surtout a :',
      options: ['Classer les composes selon leur groupe caracteristique', 'Mesurer la pression atmospherique', 'Definir un angle geometrique', 'Coder un programme'],
      correctOption: 0,
      explanation: 'Les fonctions organiques classent les molecules par groupe caracteristique.'
    },
    'structure-de-la-matiere': {
      prompt: 'La structure de la matiere etudie principalement :',
      options: ['Atomes, ions, molecules et liaisons', 'Seulement les planetes', 'Uniquement les cellules', 'Les courants marins'],
      correctOption: 0,
      explanation: 'Ce theme porte sur les entites microscopiques et leurs interactions.'
    },
    'croissance-et-developpement': {
      prompt: 'En economie, la croissance se distingue du developpement car :',
      options: ['La croissance est qualitative uniquement', 'Le developpement integre aussi des dimensions sociales', 'Ce sont des synonymes stricts', 'Aucune difference'],
      correctOption: 1,
      explanation: 'La croissance est surtout quantitative; le developpement inclut qualite de vie et structures.'
    },
    'menages-et-epargne': {
      prompt: 'L epargne d un menage correspond d abord a :',
      options: ['Toutes les depenses mensuelles', 'Le revenu non consomme', 'Un impot obligatoire', 'Une dette bancaire'],
      correctOption: 1,
      explanation: 'L epargne represente la part du revenu qui n est pas consommee.'
    },
    'monnaie-et-inflation': {
      prompt: 'Une inflation durable elevee a souvent pour effet :',
      options: ['Une hausse du pouvoir d achat reel', 'Une baisse du pouvoir d achat reel', 'Aucun impact sur les prix', 'Une suppression des marches'],
      correctOption: 1,
      explanation: 'L inflation elevee reduit le pouvoir d achat reel si les revenus ne suivent pas.'
    },
    'politiques-economiques': {
      prompt: 'Une politique budgetaire expansionniste vise generalement a :',
      options: ['Freiner toute activite', 'Soutenir la demande et l activite economique', 'Supprimer la monnaie', 'Fermer les ecoles'],
      correctOption: 1,
      explanation: 'La politique budgetaire expansionniste stimule l activite en augmentant la demande.'
    },
    'vocabulario-y-comprension': {
      prompt: 'En espagnol, pour ameliorer la comprension d un texte, il faut :',
      options: ['Ignorer le contexte', 'Identifier mots-cles et idees principales', 'Traduire lettre par lettre', 'Eviter toute relecture'],
      correctOption: 1,
      explanation: 'Les mots-cles et idees principales guident la comprehension globale.'
    },
    'lectura-y-expresion': {
      prompt: 'En expresion escrita, une production claire doit :',
      options: ['Avoir des idees organisees et des connecteurs logiques', 'Etre une liste sans lien', 'Eviter les verbes', 'Copier un paragraphe appris'],
      correctOption: 0,
      explanation: 'La coherence et les connecteurs renforcent la qualite de l expression.'
    },
    'gramatica-espanola': {
      prompt: 'En gramatica espanola, l accord sujet-verbe sert a :',
      options: ['Relier sujet et action correctement', 'Changer la ponctuation seulement', 'Supprimer les pronoms', 'Allonger les phrases'],
      correctOption: 0,
      explanation: 'L accord sujet-verbe est une regle centrale pour la correction grammaticale.'
    },
    'produccion-escrita': {
      prompt: 'Quelle pratique ameliore le plus la produccion escrita ?',
      options: ['Ecrire sans plan', 'Planifier, rediger puis corriger', 'Eviter les revisions', 'Ecrire une seule phrase'],
      correctOption: 1,
      explanation: 'La qualite augmente avec planification, redaction et relecture.'
    },
    'population-et-demographie': {
      prompt: 'La demographie etudie principalement :',
      options: ['La dynamique des populations', 'Les reactions chimiques', 'Le codage informatique', 'La musique classique'],
      correctOption: 0,
      explanation: 'La demographie analyse taille, structure et evolution des populations.'
    },
    'croissance-et-economie': {
      prompt: 'En histoire-geo economique, un indicateur de croissance mesure surtout :',
      options: ['La variation de la production', 'Le style litteraire', 'La composition d un tableau', 'Le rythme cardiaque'],
      correctOption: 0,
      explanation: 'La croissance se lit par l evolution de la production et de l activite economique.'
    },
    'espaces-et-climat': {
      prompt: 'L etude des espaces et du climat permet notamment de :',
      options: ['Comprendre les contraintes et potentialites d un territoire', 'Determiner une formule chimique', 'Programmer une application', 'Classer des romans'],
      correctOption: 0,
      explanation: 'Le milieu physique influence fortement les activites humaines.'
    },
    'histoire-nationale': {
      prompt: 'L etude de l histoire nationale sert surtout a :',
      options: ['Memoriser des dates sans contexte', 'Comprendre les luttes, acteurs et transformations du pays', 'Eviter toute analyse critique', 'Remplacer la geographie'],
      correctOption: 1,
      explanation: 'Elle construit une comprehension structuree des dynamiques historiques nationales.'
    },
    algorithmique: {
      prompt: 'Un algorithme est avant tout :',
      options: ['Une suite ordonnee d instructions pour resoudre un probleme', 'Un composant materiel', 'Une base de donnees', 'Un navigateur web'],
      correctOption: 0,
      explanation: 'Un algorithme formalise et ordonne les etapes de resolution.'
    },
    'systemes-et-reseaux': {
      prompt: 'Le role principal d un reseau informatique est de :',
      options: ['Partager des ressources et communiquer entre machines', 'Remplacer l electricite', 'Imprimer automatiquement', 'Supprimer les donnees'],
      correctOption: 0,
      explanation: 'Un reseau connecte des machines pour echanger des donnees et services.'
    },
    programmation: {
      prompt: 'En programmation, decomposer un probleme complexe permet surtout de :',
      options: ['Le rendre plus difficile', 'Structurer la resolution en sous-problemes', 'Ignorer les erreurs', 'Eviter les tests'],
      correctOption: 1,
      explanation: 'La decomposition ameliore clarte, testabilite et maintenance.'
    },
    'bases-de-donnees': {
      prompt: 'Dans une base de donnees relationnelle, une cle primaire sert a :',
      options: ['Identifier de facon unique un enregistrement', 'Formater du texte', 'Compresser des images', 'Dessiner une interface'],
      correctOption: 0,
      explanation: 'La cle primaire garantit l unicite des lignes.'
    },
    'lekti-ak-konpreyansyon': {
      prompt: 'Nan Kreyol, pou bon konpreyansyon teks, ou dwe :',
      options: ['Chache lide prensipal ak mo kle yo', 'Li yon sel fwa san reflechi', 'Evite kestyon yo', 'Sote paragraf yo'],
      correctOption: 0,
      explanation: 'Konpreyansyon depann de idantifikasyon lide prensipal ak detay enpotan.'
    },
    'ekriti-kreyol': {
      prompt: 'Nan ekriti kreyol, kisa ki pi enpotan pou klate mesaj la ?',
      options: ['Fraz byen estriktire ak vokabiler adapte', 'Mete mo o aza', 'Ekri san ponktiyasyon', 'Repete menm mo yo'],
      correctOption: 0,
      explanation: 'Bon estrikti ak bon chwa mo rann mesaj la pi klere.'
    },
    vokabiler: {
      prompt: 'Pou agrandi vokabiler, met ki metod ki pi efikas ?',
      options: ['Pratike mo yo nan kontes reyel', 'Memorize mo yo san itilize', 'Evite li teks', 'Pa janm revize'],
      correctOption: 0,
      explanation: 'Itilizasyon mo yo nan kontes ede retansyon alontem.'
    },
    kominikasyon: {
      prompt: 'Yon bon kominikasyon ekri dwe genyen :',
      options: ['Objektif klè ak lide byen klase', 'Fraz san lyezon', 'Mo teknik san eksplikasyon', 'Pa gen konklizyon'],
      correctOption: 0,
      explanation: 'Kominikasyon efikas mande estrikti klè ak lojik.'
    },
    fonctions: {
      prompt: 'En mathematiques, une fonction associe :',
      options: ['Chaque valeur d entree a une valeur de sortie', 'Plusieurs sorties aleatoires', 'Uniquement des constantes', 'Aucune variable'],
      correctOption: 0,
      explanation: 'Une fonction relie une variable independante a une image.'
    },
    'geometrie-analytique': {
      prompt: 'La geometrie analytique combine principalement :',
      options: ['Algebre et representation geometrique', 'Biologie et chimie', 'Histoire et litterature', 'Economie et droit'],
      correctOption: 0,
      explanation: 'Elle etudie les objets geometriques via des equations.'
    },
    'algebre-et-calcul': {
      prompt: 'En algebre, simplifier une expression sert d abord a :',
      options: ['Rendre les calculs et raisonnements plus fiables', 'Complexifier la notation', 'Eviter les resultats', 'Ignorer les proprietes'],
      correctOption: 0,
      explanation: 'La simplification facilite verification et resolution.'
    },
    statistiques: {
      prompt: 'En statistique, la moyenne est :',
      options: ['Un indicateur de tendance centrale', 'Une mesure de longueur', 'Une unite chimique', 'Une loi physique'],
      correctOption: 0,
      explanation: 'La moyenne resume une serie numerique autour d une valeur centrale.'
    },
    'connaissance-et-raison': {
      prompt: 'En philosophie, la raison est surtout mobilisee pour :',
      options: ['Argumenter et justifier des idees', 'Eviter toute question', 'Remplacer la science par l opinion', 'Supprimer la logique'],
      correctOption: 0,
      explanation: 'La raison structure l argumentation et la validite des jugements.'
    },
    'ethique-et-culture': {
      prompt: 'L ethique traite principalement de :',
      options: ['La question du bien et du juste', 'La composition chimique', 'Le cablage reseau', 'Les calculs integrals'],
      correctOption: 0,
      explanation: 'L ethique analyse les normes et choix moraux.'
    },
    'philosophes-classiques': {
      prompt: 'Etudier les philosophes classiques permet surtout de :',
      options: ['Comprendre des cadres de pensee majeurs', 'Memoriser des noms sans idees', 'Eviter la discussion', 'Remplacer tout raisonnement'],
      correctOption: 0,
      explanation: 'Leurs concepts servent de base a l analyse philosophique.'
    },
    metaphysique: {
      prompt: 'La metaphysique interroge notamment :',
      options: ['L etre, la realite et les principes ultimes', 'La grammaire anglaise', 'La topographie urbaine', 'Le codage binaire'],
      correctOption: 0,
      explanation: 'La metaphysique traite des fondements de la realite.'
    },
    mecanique: {
      prompt: 'En mecanique, la 2e loi de Newton relie :',
      options: ['Force, masse et acceleration', 'Pression et temperature', 'Tension et intensite', 'Longueur et surface'],
      correctOption: 0,
      explanation: 'La dynamique classique repose sur F = m.a.'
    },
    'electricite-et-magnetisme': {
      prompt: 'L induction electromagnetique correspond a :',
      options: ['Creation d une tension/courant par variation de champ magnetique', 'Production de chaleur uniquement', 'Transformation chimique', 'Mesure d un angle'],
      correctOption: 0,
      explanation: 'Une variation de flux magnetique peut induire une force electromotrice.'
    },
    'ondes-et-lumiere': {
      prompt: 'Une grandeur caracteristique d une onde est :',
      options: ['Frequence', 'Densite economique', 'Capital social', 'Taux d epargne'],
      correctOption: 0,
      explanation: 'Frequence, longueur d onde et amplitude decrivent une onde.'
    },
    cosmologie: {
      prompt: 'La cosmologie etudie principalement :',
      options: ['L origine et l evolution de l Univers', 'La syntaxe d un langage', 'Les proprietes d un polynome', 'Les styles artistiques'],
      correctOption: 0,
      explanation: 'La cosmologie analyse la structure et l histoire de l Univers.'
    },
    'genetique-et-heredite': {
      prompt: 'La genetique etudie surtout :',
      options: ['Transmission des caracteres hereditaires', 'Formation des nuages', 'Circuits electriques', 'Marches financiers'],
      correctOption: 0,
      explanation: 'Elle analyse genes, heredite et variabilite.'
    },
    'cytologie-et-anatomie': {
      prompt: 'La cytologie concerne principalement :',
      options: ['L etude des cellules', 'L etude des planetes', 'La programmation web', 'L histoire des idees'],
      correctOption: 0,
      explanation: 'La cytologie est la branche qui etudie la cellule.'
    },
    geologie: {
      prompt: 'La geologie permet notamment de :',
      options: ['Comprendre roches, structures et evolution de la Terre', 'Analyser la conjugaison', 'Definir des algorithmes', 'Etudier uniquement la musique'],
      correctOption: 0,
      explanation: 'La geologie etudie les materiaux, structures et processus terrestres.'
    },
    ecologie: {
      prompt: 'En ecologie, un ecosysteme designe :',
      options: ['Un milieu et les etres vivants qui y interagissent', 'Un seul organisme isole', 'Un schema electrique', 'Un tableau statistique'],
      correctOption: 0,
      explanation: 'Un ecosysteme inclut les organismes et leur environnement.'
    }
  };

  if (templates[key]) return templates[key];

  return {
    prompt: `En ${subject}, quelle affirmation decrit le mieux le theme "${topic}" ?`,
    options: [
      'C est une notion centrale a maitriser dans cette matiere',
      'C est un detail sans importance pedagogique',
      'C est un terme exclusivement informatique',
      'C est un concept qui n apparait jamais en evaluation'
    ],
    correctOption: 0,
    explanation: `Le theme "${topic}" apparait regulierement dans les annales de ${subject}.`
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
