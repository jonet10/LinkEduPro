export const PLATFORM_VERSION = process.env.NEXT_PUBLIC_PLATFORM_VERSION || 'v2.0.0';

export const CHANGELOG_ENTRIES = [
  {
    version: 'v2.0.0',
    date: '2026-02-17',
    highlights: [
      'Extension du profil utilisateur (photo, adresse, mode nocturne).',
      'Module Focus Mode: musique par niveau, sessions Pomodoro, statistiques journalières.',
      'Workflow de contenus par niveau avec validation administrateur.',
      'Nouveau socle quiz niveau (quizzes, questions, résultats).'
    ]
  },
  {
    version: 'v1.9.0',
    date: '2026-02-16',
    highlights: [
      'Améliorations de la bibliothèque et notifications.',
      'Renforcement du module communautaire enseignant/admin.'
    ]
  }
];

export const FOOTER_PLACEHOLDER_CONTENT = {
  'about-us': {
    title: 'About Us',
    description: 'LinkEduPro accompagne les écoles et les élèves avec des outils pédagogiques fiables, accessibles et orientés performance.'
  },
  mission: {
    title: 'Our Mission',
    description: 'Démocratiser l’accès à une préparation académique de qualité via une plateforme moderne et inclusive.'
  },
  vision: {
    title: 'Our Vision',
    description: 'Construire un écosystème numérique éducatif de référence pour les établissements et les familles.'
  },
  team: {
    title: 'Our Team',
    description: 'Une équipe pluridisciplinaire: pédagogie, produit, ingénierie et accompagnement scolaire.'
  },
  partners: {
    title: 'Partners',
    description: 'Nous collaborons avec des écoles, enseignants et organisations engagées pour l’éducation.'
  },
  careers: {
    title: 'Careers',
    description: 'Les opportunités de carrière seront bientôt publiées dans cette section.'
  },
  faq: {
    title: 'FAQ',
    description: 'Retrouvez bientôt les réponses aux questions les plus fréquentes sur la plateforme.'
  },
  documentation: {
    title: 'Documentation',
    description: 'La documentation produit/API est en cours de consolidation pour publication.'
  },
  api: {
    title: 'API',
    description: 'Espace réservé à la documentation API et aux guides d’intégration (future-ready).'
  },
  'privacy-policy': {
    title: 'Privacy Policy',
    description: 'La politique de confidentialité détaillera la collecte, l’usage et la protection des données utilisateurs.'
  },
  'terms-of-service': {
    title: 'Terms of Service',
    description: 'Les conditions d’utilisation précisent les droits et obligations des utilisateurs de LinkEduPro.'
  },
  'legal-notice': {
    title: 'Legal Notice',
    description: 'Les mentions légales officielles de la plateforme seront affichées ici.'
  },
  'cookie-policy': {
    title: 'Cookie Policy',
    description: 'Cette section décrira les cookies utilisés et les choix de consentement disponibles.'
  },
  'data-protection-policy': {
    title: 'Data Protection Policy',
    description: 'Politique dédiée à la gouvernance et à la protection des données personnelles.'
  },
  'help-center': {
    title: 'Help Center',
    description: 'Le centre d’aide centralisera les guides, tutoriels et procédures de support.'
  },
  contact: {
    title: 'Contact',
    description: 'Pour toute demande, utilisez le formulaire de contact ou les canaux officiels LinkEduPro.'
  },
  'report-issue': {
    title: 'Report an Issue',
    description: 'Signalez un problème technique ou fonctionnel afin que notre équipe le traite rapidement.'
  }
};
