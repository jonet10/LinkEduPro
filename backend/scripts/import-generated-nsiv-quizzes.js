require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const INPUT_FILE = path.resolve(__dirname, '../data/generated-nsiv-topic-quizzes.json');

function normalizeQuestionData(question) {
  const options = Array.isArray(question.options)
    ? question.options.map((opt) => String(opt || '').trim()).filter(Boolean)
    : [];
  if (options.length < 2) return null;

  const correctOption = Number(question.correctOption);
  if (!Number.isInteger(correctOption) || correctOption < 0 || correctOption >= options.length) return null;

  return {
    prompt: String(question.prompt || '').trim(),
    options,
    correctOption,
    explanation: String(question.explanation || '').trim() || null,
    isPremium: Boolean(question.isPremium),
    frequencyScore: Number(question.frequencyScore || 0),
    sourceTopic: String(question.sourceTopic || '').trim() || null
  };
}

async function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Fichier introuvable: ${INPUT_FILE}. Lance d'abord npm run exams:generate:nsiv.`);
  }

  const raw = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));
  const packs = Array.isArray(raw) ? raw : [];
  let createdSubjects = 0;
  let createdQuestions = 0;
  let skippedQuestions = 0;

  for (const pack of packs) {
    const name = String(pack?.name || '').trim();
    if (!name) continue;
    const description = String(pack?.description || '').trim() || null;
    const questions = Array.isArray(pack?.questions) ? pack.questions : [];

    const existingSubject = await prisma.subject.findUnique({ where: { name } });
    const subject = existingSubject
      ? await prisma.subject.update({
          where: { id: existingSubject.id },
          data: { description: description || existingSubject.description }
        })
      : await prisma.subject.create({
          data: { name, description }
        });

    if (!existingSubject) createdSubjects += 1;

    for (const question of questions) {
      const data = normalizeQuestionData(question);
      if (!data || !data.prompt) {
        skippedQuestions += 1;
        continue;
      }

      const exists = await prisma.question.findFirst({
        where: { subjectId: subject.id, prompt: data.prompt },
        select: { id: true }
      });
      if (exists) {
        skippedQuestions += 1;
        continue;
      }

      await prisma.question.create({
        data: {
          subjectId: subject.id,
          ...data
        }
      });
      createdQuestions += 1;
    }
  }

  console.log(`Sujets crees: ${createdSubjects}`);
  console.log(`Questions ajoutees: ${createdQuestions}`);
  console.log(`Questions ignorees (doublons/invalides): ${skippedQuestions}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
