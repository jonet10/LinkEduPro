import schoolDirectory from './schools-data.json';

const DEPARTMENT_COMMUNES = {
  Artibonite: [
    'Dessalines',
    'Desdunes',
    'Grande Saline',
    "Petite-Riviere-de-l'Artibonite",
    'Les Gonaives',
    'Ennery',
    "L'Estere",
    'Gros-Morne',
    'Anse-Rouge',
    'Terre-Neuve',
    'Marmelade',
    "Saint-Michel-de-l'Attalaye",
    'Saint-Marc',
    'Verrettes',
    'La Chapelle'
  ],
  Centre: [
    'Cerca-la-Source',
    'Thomassique',
    'Hinche',
    'Cerca-Carvajal',
    'Maissade',
    'Thomonde',
    'Lascahobas',
    'Belladere',
    'Savanette',
    'Baptiste',
    'Mirebalais',
    "Saut-d'Eau",
    'Boucan-Carre'
  ],
  "Grand'Anse": [
    "Anse-d'Hainault",
    'Dame-Marie',
    'Les Irois',
    'Corail',
    'Roseaux',
    'Beaumont',
    'Pestel',
    'Les Iles Cayemites',
    'Jeremie',
    'Abricots',
    'Moron',
    'Chambellan',
    'Marfranc',
    'Trou-Bonbon'
  ],
  Nippes: [
    'Miragoane',
    'Petite-Riviere-de-Nippes',
    'Fonds-des-Negres',
    'Paillant',
    'Anse-a-Veau',
    "L'Asile",
    'Petit-Trou-de-Nippes',
    'Plaisance-du-Sud',
    'Arnaud',
    'Barraderes',
    'Grand-Boucan'
  ],
  Nord: [
    'Acul-du-Nord',
    'Plaine-du-Nord',
    'Milot',
    'Borgne',
    'Port-Margot',
    'Cap-Haitien',
    'Limonade',
    'Quartier-Morin',
    'Grande-Riviere-du-Nord',
    'Bahon',
    'Limbe',
    'Bas-Limbe',
    'Plaisance',
    'Pilate',
    'Saint-Raphael',
    'Dondon',
    'Ranquitte',
    'Pignon',
    'La Victoire'
  ],
  'Nord-Est': [
    'Fort-Liberte',
    'Perches',
    'Ferrier',
    'Ouanaminthe',
    'Capotille',
    'Mont-Organise',
    'Trou-du-Nord',
    'Caracol',
    'Sainte-Suzanne',
    'Terrier-Rouge',
    'Vallieres',
    'Carice',
    'Mombin-Crochu'
  ],
  'Nord-Ouest': [
    'Mole-Saint-Nicolas',
    'Baie-de-Henne',
    'Bombardopolis',
    'Jean-Rabel',
    'Port-de-Paix',
    'Bassin-Bleu',
    'Chansolme',
    'La Tortue (Ile de la Tortue)',
    'La Pointe des Palmistes',
    'Saint-Louis-du-Nord',
    'Anse-a-Foleur'
  ],
  Ouest: [
    'Arcahaie',
    'Cabaret',
    'Croix-des-Bouquets',
    'Ganthier',
    'Thomazeau',
    'Cornillon',
    'Fonds-Verrettes',
    'Anse-a-Galets',
    'Pointe-a-Raquette',
    'Leogane',
    'Petit-Goave',
    'Grand-Goave',
    'Port-au-Prince',
    'Carrefour',
    'Delmas',
    'Petion-Ville',
    'Kenscoff',
    'Cite Soleil',
    'Gressier',
    'Tabarre'
  ],
  Sud: [
    'Les Cayes',
    'Camp-Perrin',
    'Chantal',
    'Ile-a-Vache',
    'Maniche',
    'Torbeck',
    'Aquin',
    'Cavaillon',
    'Saint-Louis-du-Sud',
    'Chardonnieres',
    'Les Anglais',
    'Tiburon',
    'Coteaux',
    'Port-a-Piment',
    'Roche-a-Bateau',
    'Port-Salut',
    'Arniquet',
    'Saint-Jean-du-Sud'
  ],
  'Sud-Est': [
    'Bainet',
    'Cotes-de-Fer',
    'Belle-Anse',
    'Anse-a-Pitres',
    'Grand-Gosier',
    'Thiotte',
    'Jacmel',
    'Cayes-Jacmel',
    'Marigot',
    'La Vallee-de-Jacmel'
  ]
};

function normalizeText(value) {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeCommune(value) {
  return normalizeText(value)
    .replace(/^(les|la|le|l)\s+/, '')
    .trim();
}

function pickMatchingKey(keys, value, type = 'default') {
  const target = type === 'commune' ? normalizeCommune(value) : normalizeText(value);
  if (!target) return null;

  const exact = keys.find((key) => {
    const normalized = type === 'commune' ? normalizeCommune(key) : normalizeText(key);
    return normalized === target;
  });
  if (exact) return exact;

  return keys.find((key) => {
    const normalized = type === 'commune' ? normalizeCommune(key) : normalizeText(key);
    return normalized.includes(target) || target.includes(normalized);
  }) || null;
}

export function getDepartments() {
  const fromLegacy = Object.keys(DEPARTMENT_COMMUNES);
  const fromWord = Object.keys(schoolDirectory);
  return Array.from(new Set([...fromLegacy, ...fromWord]));
}

export function getCommunes(department) {
  if (!department) return [];

  const legacyCommunes = DEPARTMENT_COMMUNES[department] || [];
  const departmentKey = pickMatchingKey(Object.keys(schoolDirectory), department);
  const wordCommunes = departmentKey ? Object.keys(schoolDirectory[departmentKey] || {}) : [];

  return Array.from(new Set([...legacyCommunes, ...wordCommunes]));
}

export function getSchools(department, commune) {
  if (!department || !commune) return [];

  const departmentKey = pickMatchingKey(Object.keys(schoolDirectory), department);
  if (!departmentKey) return [];

  const communes = schoolDirectory[departmentKey] || {};
  const communeKey = pickMatchingKey(Object.keys(communes), commune, 'commune');
  if (!communeKey) return [];

  return Array.from(new Set(communes[communeKey] || []));
}
