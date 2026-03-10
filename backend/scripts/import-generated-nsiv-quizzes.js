require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const INPUT_FILE = path.resolve(__dirname, '../data/generated-nsiv-topic-quizzes.json');
const LEGACY_PROMPT_PREFIX = 'Dans les annales NSIV, le theme "';

function normalizeKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function parseRequestedSubjects() {
  const raw = String(process.env.NSIV_SUBJECT_FILTER || '').trim();
  if (!raw) return null;
  const values = raw
    .split(',')
    .map((item) => normalizeKey(item))
    .filter(Boolean);
  return values.length ? new Set(values) : null;
}

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
  const requestedSubjects = parseRequestedSubjects();
  const packs = (Array.isArray(raw) ? raw : []).filter((pack) => {
    if (!requestedSubjects) return true;
    const key = normalizeKey(pack?.name);
    return requestedSubjects.has(key);
  });
  let createdSubjects = 0;
  let createdQuestions = 0;
  let updatedQuestions = 0;
  let skippedQuestions = 0;
  let deletedLegacyQuestions = 0;

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

    const deleted = await prisma.question.deleteMany({
      where: {
        subjectId: subject.id,
        isPremium: true,
        prompt: {
          startsWith: LEGACY_PROMPT_PREFIX
        }
      }
    });
    deletedLegacyQuestions += deleted.count;

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
        await prisma.question.update({
          where: { id: exists.id },
          data
        });
        updatedQuestions += 1;
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
  if (requestedSubjects) {
    console.log(`Filtre sujets actif: ${Array.from(requestedSubjects.values()).join(', ')}`);
  }
  console.log(`Anciennes questions NSIV supprimees: ${deletedLegacyQuestions}`);
  console.log(`Questions ajoutees: ${createdQuestions}`);
  console.log(`Questions mises a jour: ${updatedQuestions}`);
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
