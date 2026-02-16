const BOOKS = [
  {
    id: 'math-001',
    title: 'Algebre fondamentale pour lyceens',
    subject: 'Mathematiques',
    level: 'Secondaire',
    access: 'free',
    format: 'PDF',
    description: 'Revision des bases: equations, inegalites, systemes.',
    url: 'https://openstax.org/details/books/algebra-and-trigonometry-2e'
  },
  {
    id: 'phy-001',
    title: 'Physique generale: mecanique',
    subject: 'Physique',
    level: 'Secondaire',
    access: 'free',
    format: 'PDF',
    description: 'Notions de mouvement, forces, energie et exercices types.',
    url: 'https://openstax.org/details/books/college-physics-2e'
  },
  {
    id: 'fr-001',
    title: 'Guide de redaction et comprehension',
    subject: 'Francais',
    level: 'Secondaire',
    access: 'free',
    format: 'PDF',
    description: 'Techniques de lecture, resume et expression ecrite.',
    url: 'https://openlibrary.org/'
  },
  {
    id: 'math-prem-001',
    title: 'Annales corrigees Maths - Pack Premium',
    subject: 'Mathematiques',
    level: 'Terminale',
    access: 'premium',
    format: 'PDF + Corriges',
    description: 'Compilation thematique et strategies de resolution rapide.',
    url: '#premium'
  },
  {
    id: 'phy-prem-001',
    title: 'Simulation examen Physique - Premium',
    subject: 'Physique',
    level: 'Terminale',
    access: 'premium',
    format: 'Pack interactif',
    description: 'Series chronometrees, correction pas a pas, analyse des erreurs.',
    url: '#premium'
  },
  {
    id: 'ses-prem-001',
    title: 'Statistiques et graphes avances - Premium',
    subject: 'SES/Maths',
    level: 'Terminale',
    access: 'premium',
    format: 'PDF + Video',
    description: 'Methodes d interpretation de donnees et sujets probables.',
    url: '#premium'
  }
];

async function listBooks(req, res, next) {
  try {
    const free = BOOKS.filter((b) => b.access === 'free');
    const premium = BOOKS.filter((b) => b.access === 'premium');
    return res.json({
      free,
      premium,
      note: 'Les livres premium necessitent un abonnement actif.'
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { listBooks };
