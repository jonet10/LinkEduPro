require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const ninthGradePack = [
  {
    subjectName: '9e - Francais',
    description: 'Quiz 9e base sur les examens de francais.',
    questions: [
      {
        prompt: 'Choisis la phrase correctement ponctuee.',
        options: [
          'Demain nous irons au marche',
          'Demain, nous irons au marche.',
          'Demain nous irons, au marche',
          'Demain nous, irons au marche'
        ],
        correctOption: 1,
        explanation: 'La virgule et le point final sont correctement places.'
      },
      {
        prompt: 'Quel est le temps du verbe dans: "Nous avons termine le devoir"?',
        options: ['Imparfait', 'Plus-que-parfait', 'Passe compose', 'Present'],
        correctOption: 2,
        explanation: 'Auxiliaire au present + participe passe = passe compose.'
      },
      {
        prompt: 'Reponse courte: ecris un synonyme de "rapide".',
        answerType: 'TEXT',
        correctText: 'vite',
        explanation: 'D autres synonymes existent, mais "vite" est la reference.'
      }
    ]
  },
  {
    subjectName: '9e - Algebre',
    description: 'Quiz 9e base sur les examens d algebre.',
    questions: [
      {
        prompt: 'Simplifie: 3x + 2x = ?',
        options: ['5x', '6x', 'x^5', '5'],
        correctOption: 0,
        explanation: 'On additionne les coefficients des termes semblables.'
      },
      {
        prompt: 'Si x = 4, alors x^2 - 3 = ?',
        options: ['13', '16', '1', '5'],
        correctOption: 0,
        explanation: '4^2 - 3 = 16 - 3 = 13.'
      },
      {
        prompt: 'Reponse courte: donne la valeur de x dans 2x = 10.',
        answerType: 'TEXT',
        correctText: '5',
        explanation: '2x = 10 donc x = 5.'
      }
    ]
  },
  {
    subjectName: '9e - Geometrie',
    description: 'Quiz 9e base sur les examens de geometrie.',
    questions: [
      {
        prompt: 'La somme des angles d un triangle vaut:',
        options: ['90 degres', '180 degres', '270 degres', '360 degres'],
        correctOption: 1,
        explanation: 'Propriete fondamentale du triangle.'
      },
      {
        prompt: 'Un carre possede combien de cotes egaux?',
        options: ['2', '3', '4', '5'],
        correctOption: 2,
        explanation: 'Les 4 cotes d un carre sont egaux.'
      },
      {
        prompt: 'Reponse courte: combien de diagonales a un rectangle?',
        answerType: 'TEXT',
        correctText: '2',
        explanation: 'Tout rectangle possede deux diagonales.'
      }
    ]
  },
  {
    subjectName: '9e - Biologie',
    description: 'Quiz 9e base sur les examens de biologie.',
    questions: [
      {
        prompt: 'Quel organe pompe le sang dans le corps humain?',
        options: ['Le foie', 'Le coeur', 'Le rein', 'Le poumon'],
        correctOption: 1,
        explanation: 'Le coeur assure la circulation sanguine.'
      },
      {
        prompt: 'La photosynthese se fait principalement dans:',
        options: ['La racine', 'La fleur', 'La feuille', 'La graine'],
        correctOption: 2,
        explanation: 'Les feuilles contiennent la chlorophylle.'
      },
      {
        prompt: 'Reponse courte: cite le gaz que nous respirons principalement.',
        answerType: 'TEXT',
        correctText: 'oxygene',
        explanation: 'Le gaz vital est l oxygene.'
      }
    ]
  },
  {
    subjectName: '9e - Espagnol',
    description: 'Quiz 9e base sur les examens d espagnol.',
    questions: [
      {
        prompt: 'Comment dit-on "bonjour" en espagnol?',
        options: ['Gracias', 'Hola', 'Adios', 'Buenas noches'],
        correctOption: 1,
        explanation: '"Hola" signifie salut/bonjour.'
      },
      {
        prompt: 'Choisis la traduction correcte de "ecole":',
        options: ['Casa', 'Escuela', 'Libro', 'Ciudad'],
        correctOption: 1,
        explanation: '"Escuela" = ecole.'
      },
      {
        prompt: 'Reponse courte: ecris en espagnol le mot "livre".',
        answerType: 'TEXT',
        correctText: 'libro',
        explanation: '"Libro" veut dire livre.'
      }
    ]
  },
  {
    subjectName: '9e - Informatique',
    description: 'Quiz 9e base sur les examens d informatique.',
    questions: [
      {
        prompt: 'Quel appareil est utilise pour saisir du texte?',
        options: ['Ecran', 'Clavier', 'Imprimante', 'Haut-parleur'],
        correctOption: 1,
        explanation: 'Le clavier sert a la saisie.'
      },
      {
        prompt: 'Un fichier PDF est generalement:',
        options: ['Un format audio', 'Un format video', 'Un format de document', 'Un jeu'],
        correctOption: 2,
        explanation: 'PDF est un format de document.'
      },
      {
        prompt: 'Reponse courte: que signifie CPU?',
        answerType: 'TEXT',
        correctText: 'central processing unit',
        explanation: 'CPU = Central Processing Unit.'
      }
    ]
  }
];

function toQuestionData(question) {
  if (question.answerType === 'TEXT') {
    return {
      prompt: question.prompt.trim(),
      answerType: 'TEXT',
      options: [],
      correctOption: -1,
      correctText: String(question.correctText || '').trim(),
      explanation: question.explanation || null,
      isPremium: false,
      frequencyScore: 0,
      sourceTopic: 'Examen 9e'
    };
  }

  return {
    prompt: question.prompt.trim(),
    answerType: 'MCQ',
    options: question.options,
    correctOption: Number(question.correctOption),
    correctText: null,
    explanation: question.explanation || null,
    isPremium: false,
    frequencyScore: 0,
    sourceTopic: 'Examen 9e'
  };
}

async function main() {
  const examFolder = path.resolve(__dirname, '../../Examen 9e');
  if (!fs.existsSync(examFolder)) {
    throw new Error(`Dossier introuvable: ${examFolder}`);
  }

  const files = fs.readdirSync(examFolder).filter((name) => /\.(docx|pdf)$/i.test(name));
  console.log(`Dossier analyse: ${examFolder}`);
  console.log(`Fichiers detectes: ${files.length}`);
  for (const file of files) {
    console.log(` - ${file}`);
  }

  for (const pack of ninthGradePack) {
    const subject = await prisma.subject.upsert({
      where: { name: pack.subjectName },
      update: { description: pack.description },
      create: {
        name: pack.subjectName,
        description: pack.description
      }
    });

    let createdCount = 0;
    for (const question of pack.questions) {
      const existing = await prisma.question.findFirst({
        where: {
          subjectId: subject.id,
          prompt: question.prompt.trim()
        }
      });

      if (existing) continue;

      await prisma.question.create({
        data: {
          subjectId: subject.id,
          ...toQuestionData(question)
        }
      });
      createdCount += 1;
    }

    console.log(`${pack.subjectName}: ${createdCount} question(s) ajoutee(s).`);
  }

  console.log('Import quiz 9e termine.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
