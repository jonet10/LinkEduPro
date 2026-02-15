require('dotenv').config();
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
  },
  {
    name: 'Physique - Quiz 1 Magnetisme et Induction',
    description: '10 questions inspirees des annales sur champ magnetique, bobine et induction.',
    questions: [
      {
        prompt: 'Au centre d un solenoide long parcouru par un courant, le champ magnetique est :',
        options: ['Quasi uniforme', 'Toujours nul', 'Toujours radial', 'Toujours variable aleatoirement'],
        correctOption: 0,
        explanation: 'Modele classique des annales de physique.'
      },
      {
        prompt: 'L unite du champ magnetique B dans le SI est :',
        options: ['Tesla', 'Farad', 'Henry', 'Volt'],
        correctOption: 0,
        explanation: 'Le tesla (T) est l unite de B.'
      },
      {
        prompt: 'Le flux magnetique a travers une surface S vaut :',
        options: ['Phi = B S cos(alpha)', 'Phi = B/S', 'Phi = B + S', 'Phi = S/B'],
        correctOption: 0,
        explanation: 'Formule utilisee dans les exercices d induction.'
      },
      {
        prompt: 'Un courant induit apparait dans une bobine si :',
        options: ['Le flux magnetique varie', 'La resistance est constante', 'La temperature diminue', 'Le courant est nul'],
        correctOption: 0,
        explanation: 'Loi de Faraday-Lenz.'
      },
      {
        prompt: 'La f.e.m. d auto-induction s oppose a la cause qui lui donne naissance selon :',
        options: ['La loi de Lenz', 'La loi d Ohm', 'La loi de Coulomb', 'La loi de Joule'],
        correctOption: 0,
        explanation: 'Sens du courant induit.'
      },
      {
        prompt: 'La reactance inductive d une bobine ideale est :',
        options: ['XL = omega L', 'XL = 1/(omega L)', 'XL = R/L', 'XL = omega / L'],
        correctOption: 0,
        explanation: 'Relation en regime sinusoIdal.'
      },
      {
        prompt: 'La force de Laplace est maximale lorsque le conducteur est :',
        options: ['Perpendiculaire au champ B', 'Parallele a B', 'Sans courant', 'Isolant'],
        correctOption: 0,
        explanation: 'F = BIL sin(theta).'
      },
      {
        prompt: 'Le sens des lignes de champ magnetique sort en general du pole :',
        options: ['Nord', 'Sud', 'Est', 'Ouest'],
        correctOption: 0,
        explanation: 'A l exterieur de l aimant: Nord vers Sud.'
      },
      {
        prompt: 'Un galvanometre est principalement utilise pour :',
        options: ['Detecter et mesurer de faibles courants', 'Mesurer une masse', 'Mesurer une pression', 'Mesurer une vitesse de son'],
        correctOption: 0,
        explanation: 'Instrument frequent dans les annales.'
      },
      {
        prompt: 'La sensibilite d un galvanometre est le rapport :',
        options: ['Deviation / intensite', 'Intensite / deviation', 'Tension / courant', 'Puissance / tension'],
        correctOption: 0,
        explanation: 'Grande deviation pour faible courant => sensibilite elevee.'
      }
    ]
  },
  {
    name: 'Physique - Quiz 2 Condensateurs et AC',
    description: '10 questions inspirees des annales sur condensateur, capacite et courant alternatif.',
    questions: [
      {
        prompt: 'La capacite d un condensateur est definie par la relation :',
        options: ['C = Q/U', 'C = U/Q', 'C = R/I', 'C = U*I'],
        correctOption: 0,
        explanation: 'Definition fondamentale de la capacite.'
      },
      {
        prompt: 'L unite de la capacite electrique est :',
        options: ['Farad', 'Tesla', 'Ohm', 'Watt'],
        correctOption: 0,
        explanation: 'Unite SI: farad (F).'
      },
      {
        prompt: 'Dans une association en serie de condensateurs, la capacite equivalente est :',
        options: ['Inferieure a la plus petite', 'Egale a la somme', 'Superieure a la plus grande', 'Toujours egale a 1'],
        correctOption: 0,
        explanation: 'En serie, Ceq diminue.'
      },
      {
        prompt: 'Dans une association en parallele de condensateurs, la capacite equivalente est :',
        options: ['La somme des capacites', 'L inverse de la somme', 'Toujours inferieure a chaque capacite', 'Nulle'],
        correctOption: 0,
        explanation: 'En parallele, Ceq = C1 + C2 + ...'
      },
      {
        prompt: 'En regime continu etabli, un condensateur ideal :',
        options: ['Bloque le courant', 'Laisse passer indefiniment le courant', 'Se comporte comme une resistance nulle', 'Genere une tension negative'],
        correctOption: 0,
        explanation: 'En continu permanent, i = 0.'
      },
      {
        prompt: 'La reactance capacitive s ecrit :',
        options: ['Xc = 1/(omega C)', 'Xc = omega C', 'Xc = RC', 'Xc = R/C'],
        correctOption: 0,
        explanation: 'Formule classique des annales AC.'
      },
      {
        prompt: 'Dans un condensateur ideal en alternatif, le courant est :',
        options: ['En avance de phase sur la tension', 'En retard de phase', 'En phase', 'Toujours nul'],
        correctOption: 0,
        explanation: 'Le courant precede la tension.'
      },
      {
        prompt: 'Le champ electrique entre deux armatures planes est :',
        options: ['E = U/d', 'E = U*d', 'E = d/U', 'E = U + d'],
        correctOption: 0,
        explanation: 'Modele de condensateur plan ideal.'
      },
      {
        prompt: 'L energie stockee dans un condensateur est :',
        options: ['E = 1/2 C U^2', 'E = C/U', 'E = U/C', 'E = C + U'],
        correctOption: 0,
        explanation: 'Formule d energie electrostatique.'
      },
      {
        prompt: 'Pour un signal sinusoidal, la relation entre periode et frequence est :',
        options: ['T = 1/f', 'T = f', 'T = 2f', 'T = f/2'],
        correctOption: 0,
        explanation: 'Relation de base en AC.'
      }
    ]
  },
  {
    name: 'Physique - Quiz 3 Mecanique et Chute Libre',
    description: '10 questions inspirees des annales sur mouvement, projectile et energie.',
    questions: [
      {
        prompt: 'Dans un mouvement rectiligne uniforme, l acceleration est :',
        options: ['Nulle', 'Constante positive', 'Constante negative', 'Toujours variable'],
        correctOption: 0,
        explanation: 'La vitesse reste constante.'
      },
      {
        prompt: 'En chute libre ideale, un corps est soumis principalement a :',
        options: ['Son poids', 'Une force magnetique', 'Une force electrique dominante', 'Aucune force'],
        correctOption: 0,
        explanation: 'Sans frottement, seule la pesanteur agit.'
      },
      {
        prompt: 'La valeur de l acceleration de pesanteur au voisinage de la Terre est environ :',
        options: ['9,8 m/s^2', '98 m/s^2', '0,98 m/s^2', '1 m/s'],
        correctOption: 0,
        explanation: 'Valeur usuelle de g.'
      },
      {
        prompt: 'Dans un lancer horizontal sans frottements, l acceleration horizontale est :',
        options: ['Nulle', 'Egale a g', 'Egale a 2g', 'Toujours negative'],
        correctOption: 0,
        explanation: 'Aucune force horizontale dans le modele ideal.'
      },
      {
        prompt: 'Au sommet d un lancer vertical vers le haut (sans frottements), la vitesse vaut :',
        options: ['0 instantanement', 'g', 'Maximale', 'Infinie'],
        correctOption: 0,
        explanation: 'La vitesse change de sens au sommet.'
      },
      {
        prompt: 'L energie cinetique d un mobile de masse m et vitesse v est :',
        options: ['Ec = 1/2 m v^2', 'Ec = m v', 'Ec = m g h', 'Ec = m/v'],
        correctOption: 0,
        explanation: 'Formule standard.'
      },
      {
        prompt: 'Un mouvement circulaire uniforme possede :',
        options: ['Une vitesse de norme constante', 'Une trajectoire rectiligne', 'Une acceleration nulle', 'Une vitesse nulle'],
        correctOption: 0,
        explanation: 'La direction change mais pas la norme.'
      },
      {
        prompt: 'Pour un projectile sans frottements, la trajectoire est :',
        options: ['Parabolique', 'Circulaire', 'Hyperbolique', 'Rectiligne uniforme'],
        correctOption: 0,
        explanation: 'Resultat classique de decomposition du mouvement.'
      },
      {
        prompt: 'La quantite de mouvement d un corps s ecrit :',
        options: ['p = m v', 'p = m/g', 'p = v/m', 'p = m + v'],
        correctOption: 0,
        explanation: 'Definition de la quantite de mouvement.'
      },
      {
        prompt: 'Un satellite geostationnaire orbite dans :',
        options: ['Le plan equatorial terrestre', 'Un plan polaire', 'Une trajectoire parabolique', 'Un plan quelconque inclIne'],
        correctOption: 0,
        explanation: 'Condition de geostationnarite.'
      }
    ]
  },
  {
    name: 'Physique - Quiz 4 Ondes et Oscillations',
    description: '10 questions inspirees des annales sur ondes, pendule et periodicite.',
    questions: [
      {
        prompt: 'Une onde mecanique transporte :',
        options: ['De l energie', 'De la matiere sur longue distance', 'Uniquement des charges electriques', 'Uniquement de la masse'],
        correctOption: 0,
        explanation: 'Principe de propagation des ondes mecaniques.'
      },
      {
        prompt: 'Une onde periodique presente une periodicite :',
        options: ['Temporelle et spatiale', 'Uniquement spatiale', 'Uniquement temporelle', 'Aucune periodicite'],
        correctOption: 0,
        explanation: 'Double periodicite classique.'
      },
      {
        prompt: 'La relation entre vitesse d onde v, longueur d onde lambda et frequence f est :',
        options: ['v = lambda f', 'v = lambda/f', 'v = f/lambda', 'v = lambda + f'],
        correctOption: 0,
        explanation: 'Relation fondamentale des ondes.'
      },
      {
        prompt: 'La periode d une onde est :',
        options: ['T = 1/f', 'T = f', 'T = 2f', 'T = f^2'],
        correctOption: 0,
        explanation: 'Inverse de la frequence.'
      },
      {
        prompt: 'Un pendule simple (petites oscillations) a une periode qui depend surtout de :',
        options: ['La longueur et g', 'La masse uniquement', 'La couleur du fil', 'La temperature ambiante seulement'],
        correctOption: 0,
        explanation: 'T = 2pi sqrt(l/g).'
      },
      {
        prompt: 'Le mouvement harmonique simple peut etre decrit par :',
        options: ['Une loi sinusoidale', 'Une loi exponentielle pure', 'Une loi lineaire', 'Une loi logarithmique'],
        correctOption: 0,
        explanation: 'Position, vitesse et acceleration sinusoidales.'
      },
      {
        prompt: 'La frequence s exprime en :',
        options: ['Hertz', 'Newton', 'Pascal', 'Coulomb'],
        correctOption: 0,
        explanation: 'Unite SI de la frequence.'
      },
      {
        prompt: 'Si la frequence double, la periode devient :',
        options: ['Deux fois plus petite', 'Deux fois plus grande', 'Inchangee', 'Nulle'],
        correctOption: 0,
        explanation: 'T inversement proportionnelle a f.'
      },
      {
        prompt: 'Dans une onde progressive, des points se trouvant a la meme phase sont separes de :',
        options: ['k*lambda (k entier)', 'lambda/3 uniquement', 'Toujours 1 m', 'Toujours 0'],
        correctOption: 0,
        explanation: 'Definition de la periodicite spatiale.'
      },
      {
        prompt: 'Une resonance mecanique se produit quand la frequence d excitation est proche de :',
        options: ['La frequence propre', 'Zero', 'L infini', 'La masse du systeme'],
        correctOption: 0,
        explanation: 'Phenomene de resonance.'
      }
    ]
  },
  {
    name: 'Physique - Quiz 5 Circuits RLC et Mesures',
    description: '10 questions inspirees des annales sur RLC, phase et mesures electriques.',
    questions: [
      {
        prompt: 'Dans un circuit purement resistif en AC, tension et courant sont :',
        options: ['En phase', 'En opposition', 'En quadrature', 'Sans relation'],
        correctOption: 0,
        explanation: 'Cas purement resistif.'
      },
      {
        prompt: 'Dans une inductance pure en AC, la tension est :',
        options: ['En avance de phase sur le courant', 'En retard de phase', 'En phase', 'Toujours nulle'],
        correctOption: 0,
        explanation: 'uL precede i.'
      },
      {
        prompt: 'Dans un condensateur ideal en AC, la tension est :',
        options: ['En retard de phase sur le courant', 'En avance de phase', 'En phase', 'Toujours nulle'],
        correctOption: 0,
        explanation: 'uC retarde par rapport a i.'
      },
      {
        prompt: 'La condition de resonance dans un RLC serie est :',
        options: ['XL = XC', 'R = 0', 'XL = 0', 'XC = 0'],
        correctOption: 0,
        explanation: 'Impedance minimale en resonance serie.'
      },
      {
        prompt: 'L impedance d un dipole resistif pur est egale a :',
        options: ['R', '1/R', 'R^2', '0'],
        correctOption: 0,
        explanation: 'Z = R en resistance pure.'
      },
      {
        prompt: 'La puissance active moyenne en regime sinusoidal s ecrit :',
        options: ['P = Ueff Ieff cos(phi)', 'P = Ueff/Ieff', 'P = Ueff + Ieff', 'P = cos(phi) seulement'],
        correctOption: 0,
        explanation: 'Expression de la puissance active.'
      },
      {
        prompt: 'Un voltmetre se branche :',
        options: ['En parallele', 'En serie', 'En court-circuit', 'Sur la masse uniquement'],
        correctOption: 0,
        explanation: 'Mesure de tension entre deux points.'
      },
      {
        prompt: 'Un amperemetre se branche en general :',
        options: ['En serie', 'En parallele', 'Aux bornes de la source uniquement', 'Aucune connexion necessaire'],
        correctOption: 0,
        explanation: 'Mesure du courant traversant la branche.'
      },
      {
        prompt: 'La valeur efficace d une tension sinusoidale de valeur max Um est :',
        options: ['Ueff = Um/sqrt(2)', 'Ueff = Um', 'Ueff = 2Um', 'Ueff = Um^2'],
        correctOption: 0,
        explanation: 'Relation standard pour un sinus.'
      },
      {
        prompt: 'La pulsation omega est reliee a la frequence f par :',
        options: ['omega = 2*pi*f', 'omega = f/(2*pi)', 'omega = 1/f', 'omega = f^2'],
        correctOption: 0,
        explanation: 'Definition de la pulsation.'
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
