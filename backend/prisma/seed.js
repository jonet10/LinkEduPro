const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const seedData = [
  {
    name: 'Mathematiques',
    description: 'Algebre, geometrie, logique et calcul.',
    questions: [
      {
        prompt: 'Combien font 12 x 8 ?',
        options: ['84', '96', '104', '112'],
        correctOption: 1,
        explanation: '12 x 8 = 96'
      },
      {
        prompt: 'Quelle est la racine carree de 81 ?',
        options: ['7', '8', '9', '10'],
        correctOption: 2,
        explanation: 'La racine carree de 81 est 9.'
      },
      {
        prompt: 'Un triangle a combien de cotes ?',
        options: ['2', '3', '4', '5'],
        correctOption: 1,
        explanation: 'Un triangle a 3 cotes.'
      }
    ]
  },
  {
    name: 'Sciences',
    description: 'Physique, chimie et sciences de la vie.',
    questions: [
      {
        prompt: 'L eau bout a quelle temperature (au niveau de la mer) ?',
        options: ['90 C', '100 C', '110 C', '120 C'],
        correctOption: 1,
        explanation: 'A pression normale, l eau bout a 100 C.'
      },
      {
        prompt: 'Quelle planete est appelee la planete rouge ?',
        options: ['Mars', 'Venus', 'Jupiter', 'Mercure'],
        correctOption: 0,
        explanation: 'Mars est la planete rouge.'
      },
      {
        prompt: 'Le corps humain a besoin de quel gaz pour respirer ?',
        options: ['Hydrogene', 'Azote', 'Oxygene', 'Helium'],
        correctOption: 2,
        explanation: 'L oxygene est essentiel a la respiration.'
      }
    ]
  },
  {
    name: 'Francais',
    description: 'Grammaire, vocabulaire et comprehension.',
    questions: [
      {
        prompt: 'Quel est le synonyme de heureux ?',
        options: ['Triste', 'Content', 'Fache', 'Paresseux'],
        correctOption: 1,
        explanation: 'Content est un synonyme de heureux.'
      },
      {
        prompt: 'Quel mot est un verbe ?',
        options: ['Table', 'Manger', 'Bleu', 'Rapidement'],
        correctOption: 1,
        explanation: 'Manger est un verbe.'
      },
      {
        prompt: 'Combien y a-t-il de voyelles en francais classique ?',
        options: ['4', '5', '6', '7'],
        correctOption: 2,
        explanation: 'On compte habituellement 6 voyelles principales : a, e, i, o, u, y.'
      }
    ]
  },
  {
    name: 'Physique - Anciens Examens',
    description: 'Questions inspirees des anciens sujets de physique (2015-2025).',
    questions: [
      {
        prompt: 'Dans la region centrale d une bobine, les lignes de champ magnetique sont en general :',
        options: ['Circulaires', 'Rectilignes et paralleles', 'Spiralees', 'Nulles'],
        correctOption: 1,
        explanation: 'Au centre d une bobine longue, le champ peut etre considere uniforme.'
      },
      {
        prompt: 'La f.e.m. d auto-induction apparait lorsqu il y a :',
        options: ['Variation du flux magnetique', 'Variation de temperature uniquement', 'Frottement mecanique', 'Absence de courant'],
        correctOption: 0,
        explanation: 'Selon Faraday-Lenz, une variation de flux induit une f.e.m.'
      },
      {
        prompt: 'Dans un condensateur, les deux armatures portent des charges :',
        options: ['Egales et de meme signe', 'Differentes et de meme signe', 'Egales et de signes opposes', 'Nulles en permanence'],
        correctOption: 2,
        explanation: 'Un condensateur stocke +Q et -Q sur ses armatures.'
      },
      {
        prompt: 'En regime permanent, un condensateur ideal bloque :',
        options: ['Le courant continu', 'Le courant alternatif', 'Tout type de courant', 'Aucun courant'],
        correctOption: 0,
        explanation: 'En continu etabli, il se comporte comme un circuit ouvert.'
      },
      {
        prompt: 'La reactance capacitive Xc est proportionnelle a :',
        options: ['1/(omega C)', 'omega C', 'R/C', 'omega/R'],
        correctOption: 0,
        explanation: 'La formule est Xc = 1/(omega C).'
      },
      {
        prompt: 'Dans un mouvement circulaire uniforme, la vitesse :',
        options: ['Est constante en norme', 'Est nulle', 'Diminue lineairement', 'Augmente lineairement'],
        correctOption: 0,
        explanation: 'La norme de la vitesse est constante, sa direction change.'
      },
      {
        prompt: 'Un satellite geostationnaire a une orbite :',
        options: ['Circulaire dans le plan equatorial', 'Elliptique polaire', 'Circulaire polaire', 'Parabolique'],
        correctOption: 0,
        explanation: 'Il reste au-dessus du meme point terrestre.'
      },
      {
        prompt: 'Le champ electrique entre deux armatures paralleles est donne par :',
        options: ['E = U/d', 'E = U*d', 'E = d/U', 'E = U + d'],
        correctOption: 0,
        explanation: 'Pour un condensateur plan ideal, E = U/d.'
      },
      {
        prompt: 'La sensibilite d un galvanometre est le rapport :',
        options: ['Deviation / intensite', 'Intensite / deviation', 'Tension / puissance', 'Resistance / tension'],
        correctOption: 0,
        explanation: 'Une sensibilite elevee donne une grande deviation pour un faible courant.'
      },
      {
        prompt: 'Entre les branches d un aimant en U et au centre d un solenoide, le champ peut etre considere :',
        options: ['Uniforme', 'Toujours nul', 'Toujours turbulent', 'Toujours radial'],
        correctOption: 0,
        explanation: 'Dans ces zones, on adopte souvent le modele de champ uniforme.'
      },
      {
        prompt: 'Un courant alternatif sinusoIdal :',
        options: ['Change de sens periodiquement', 'Circule dans un seul sens', 'Est toujours constant', 'N existe pas en pratique'],
        correctOption: 0,
        explanation: 'Il inverse son sens a chaque demi-periode.'
      },
      {
        prompt: 'Un corps en chute libre ideale est soumis principalement a :',
        options: ['Son poids', 'Une force de frottement dominante', 'Une force electrique seule', 'Aucune force'],
        correctOption: 0,
        explanation: 'Sans frottements, seule la pesanteur agit.'
      },
      {
        prompt: 'La reactance inductive d une bobine est :',
        options: ['XL = omega L', 'XL = 1/(omega L)', 'XL = R/L', 'XL = L/R'],
        correctOption: 0,
        explanation: 'Theme recurrent des sujets 2021-2025: XL augmente avec la pulsation.'
      },
      {
        prompt: 'La capacite equivalente de condensateurs montes en serie est :',
        options: ['Inferieure a la plus petite capacite', 'Egale a la somme des capacites', 'Superieure a la plus grande capacite', 'Toujours egale a 1 F'],
        correctOption: 0,
        explanation: 'Sujets 2025 et 2018: en serie, la capacite equivalente diminue.'
      },
      {
        prompt: 'La capacite equivalente de condensateurs montes en parallele est :',
        options: ['Somme des capacites', 'Inverse de la somme des inverses', 'Toujours inferieure a chaque capacite', 'Nulle'],
        correctOption: 0,
        explanation: 'Sujets 2018 et 2025: en parallele, les capacites s additionnent.'
      },
      {
        prompt: 'Dans un condensateur ideal en regime sinusoIdal, le courant est :',
        options: ['En avance de phase sur la tension', 'En retard de phase sur la tension', 'En phase avec la tension', 'Toujours nul'],
        correctOption: 0,
        explanation: 'Base d electricite alternative presente dans plusieurs annales.'
      },
      {
        prompt: 'Dans une inductance pure en regime sinusoIdal, la tension est :',
        options: ['En avance de phase sur le courant', 'En retard de phase sur le courant', 'En phase avec le courant', 'Toujours nulle'],
        correctOption: 0,
        explanation: 'Sujet 2016 (Phytotron): relation de phase sur bobine ideale.'
      },
      {
        prompt: 'Une onde mecanique transporte principalement :',
        options: ['De l energie', 'De la matiere sur grande distance', 'Uniquement des electrons', 'Uniquement de la chaleur'],
        correctOption: 0,
        explanation: 'Sujet 2016 (Phytotron): une onde transporte de l energie, pas de matiere.'
      },
      {
        prompt: 'Une onde periodique presente une double periodicite :',
        options: ['Temporelle et spatiale', 'Masse et charge', 'Pression et volume', 'Longueur et largeur'],
        correctOption: 0,
        explanation: 'Sujet 2015 et 2018: periodicite dans le temps et dans l espace.'
      },
      {
        prompt: 'Le vecteur champ magnetique B est en chaque point :',
        options: ['Tangent aux lignes de champ', 'Perpendiculaire aux lignes de champ', 'Toujours nul', 'Sans direction'],
        correctOption: 0,
        explanation: 'Sujet 2015: la direction locale de B suit la ligne de champ.'
      },
      {
        prompt: 'Le farad (F) est la capacite d un condensateur qui stocke :',
        options: ['1 C sous 1 V', '1 A sous 1 ohm', '1 W sous 1 s', '1 J sous 1 N'],
        correctOption: 0,
        explanation: 'Sujet 2016 (Phytotron) et autres: definition usuelle de 1 F.'
      },
      {
        prompt: 'Un phenomene est periodique lorsqu il se reproduit :',
        options: ['A intervalles de temps egaux', 'De maniere aleatoire', 'Une seule fois', 'Uniquement la nuit'],
        correctOption: 0,
        explanation: 'Definition presente dans les annales de 2016.'
      },
      {
        prompt: 'En chute libre ideale, l acceleration d un corps vaut :',
        options: ['g vers le bas', '0', 'g vers le haut', 'Variable et aleatoire'],
        correctOption: 0,
        explanation: 'Sujet 2016 et 2018: acceleration constante de pesanteur.'
      },
      {
        prompt: 'Dans un mouvement rectiligne uniforme, l acceleration est :',
        options: ['Nulle', 'Constante non nulle', 'Toujours positive', 'Toujours negative'],
        correctOption: 0,
        explanation: 'Sujet 2015: acceleration nulle implique repos ou mouvement uniforme.'
      },
      {
        prompt: 'La periode d un courant sinusoIdal est liee a la frequence par :',
        options: ['T = 1/f', 'T = f', 'T = 2f', 'T = f/2'],
        correctOption: 0,
        explanation: 'Relation utilisee dans les exercices AC des annales.'
      },
      {
        prompt: 'Pour un courant i(t) = Im sin(wt), la pulsation vaut :',
        options: ['w = 2*pi*f', 'w = f/2*pi', 'w = T/f', 'w = R/L'],
        correctOption: 0,
        explanation: 'Formule fondamentale des signaux sinusoidaux.'
      },
      {
        prompt: 'Dans un circuit RLC serie, la resonance se produit quand :',
        options: ['XL = XC', 'R = 0 uniquement', 'XC = 0 uniquement', 'XL = 0 uniquement'],
        correctOption: 0,
        explanation: 'Theme frequent des exercices d impedance et de phase.'
      },
      {
        prompt: 'La force de Laplace sur un conducteur parcouru par un courant dans B est maximale si :',
        options: ['Conducteur perpendiculaire a B', 'Conducteur parallele a B', 'Courant nul', 'Champ nul'],
        correctOption: 0,
        explanation: 'Sujets sur roue de Barlow et loi de Laplace.'
      },
      {
        prompt: 'Le flux magnetique a travers une surface S en champ uniforme est :',
        options: ['Phi = B S cos(alpha)', 'Phi = B/S', 'Phi = S/B', 'Phi = B + S'],
        correctOption: 0,
        explanation: 'Relation exploitee dans les questions d induction.'
      },
      {
        prompt: 'Un courant induit apparait dans un circuit lorsque :',
        options: ['Le flux magnetique varie', 'La resistance est constante', 'La masse augmente', 'La temperature reste fixe'],
        correctOption: 0,
        explanation: 'Loi de Faraday-Lenz, presente dans les annales 2021 et 2022.'
      },
      {
        prompt: 'Le champ electrique entre les armatures d un condensateur plan est oriente :',
        options: ['De la plaque positive vers la plaque negative', 'De la plaque negative vers la plaque positive', 'Parallelement aux plaques', 'Sans direction definie'],
        correctOption: 0,
        explanation: 'Sujets entropie/vitesse 2025: orientation du champ dans un condensateur plan.'
      },
      {
        prompt: 'Dans un circuit purement resistif alimente en alternatif, tension et courant sont :',
        options: ['En phase', 'En opposition de phase', 'Toujours en quadrature', 'Sans relation'],
        correctOption: 0,
        explanation: 'Rappel de base souvent utilise avant les exercices RLC.'
      },
      {
        prompt: 'L energie stockee dans un condensateur de capacite C sous tension U est :',
        options: ['E = 1/2 C U^2', 'E = C/U', 'E = U/C', 'E = C + U'],
        correctOption: 0,
        explanation: 'Annales 2022 (philo C-D): question sur energie emmagasinee.'
      },
      {
        prompt: 'Un solenoide long parcouru par un courant cree en son centre un champ :',
        options: ['Quasi uniforme', 'Toujours nul', 'Radial pur', 'Aleatoire'],
        correctOption: 0,
        explanation: 'Annales 2021, 2025 et Entropie: propriete centrale du solenoide.'
      },
      {
        prompt: 'Dans un mouvement projectile sans frottements, l acceleration horizontale est :',
        options: ['Nulle', 'Egale a g', 'Constante non nulle vers x+', 'Variable avec le temps'],
        correctOption: 0,
        explanation: 'Sujets Vitesse et 2025: decomposition du mouvement de projectile.'
      },
      {
        prompt: 'Au sommet de la trajectoire d un lancer vertical (sans frottements), la vitesse est :',
        options: ['Nulle instantanement', 'Maximale', 'Egale a g', 'Toujours negative'],
        correctOption: 0,
        explanation: 'Question classique des annales (2018 notamment).'
      },
      {
        prompt: 'La periode d un pendule simple (petites oscillations) depend principalement de :',
        options: ['La longueur et g', 'La masse uniquement', 'La couleur du fil', 'La tension du reseau'],
        correctOption: 0,
        explanation: 'Sujets 2015/2016: dependence de T en fonction de l et g.'
      },
      {
        prompt: 'Les aimants naturels sont principalement des oxydes de :',
        options: ['Fer', 'Cuivre', 'Aluminium', 'Zinc'],
        correctOption: 0,
        explanation: 'Sujet Vitesse 2025: rappel sur la magnetite.'
      }
    ]
  }
];

async function main() {
  for (const subjectData of seedData) {
    const subject = await prisma.subject.upsert({
      where: { name: subjectData.name },
      update: { description: subjectData.description },
      create: {
        name: subjectData.name,
        description: subjectData.description
      }
    });

    for (const q of subjectData.questions) {
      const existing = await prisma.question.findFirst({
        where: { subjectId: subject.id, prompt: q.prompt }
      });

      if (!existing) {
        await prisma.question.create({
          data: {
            subjectId: subject.id,
            prompt: q.prompt,
            options: q.options,
            correctOption: q.correctOption,
            explanation: q.explanation
          }
        });
      }
    }
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
