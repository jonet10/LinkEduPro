/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const prisma = require('../src/config/prisma');

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function letterIndexFrom(term) {
  const normalized = normalizeText(term).toUpperCase();
  const ch = normalized.slice(0, 1);
  return /^[A-Z]$/.test(ch) ? ch : '#';
}

function mapKind(raw) {
  const normalized = normalizeText(raw).toUpperCase();
  if (normalized === 'SIGLE') return 'SIGLE';
  if (normalized === 'ABREVIATION' || normalized === 'ABRÉVIATION') return 'ABREVIATION';
  if (normalized === 'CONCEPT') return 'CONCEPT';
  return 'TERME';
}

function unescapeSqlStringLiteral(raw) {
  // Input is content between single quotes, with SQL escaping via doubled quotes: '' -> '
  return String(raw || '').replace(/''/g, "'");
}

function splitSqlValues(valueList) {
  // Splits a CSV-like SQL VALUES list, supporting single-quoted strings with doubled quote escaping.
  const out = [];
  let current = '';
  let inString = false;

  for (let i = 0; i < valueList.length; i += 1) {
    const ch = valueList[i];

    if (ch === "'") {
      if (inString && valueList[i + 1] === "'") {
        current += "''";
        i += 1;
        continue;
      }
      inString = !inString;
      current += ch;
      continue;
    }

    if (!inString && ch === ',') {
      out.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.trim()) out.push(current.trim());
  return out;
}

function parseInsertLine(line) {
  const trimmed = String(line || '').trim();
  if (!/^INSERT\s+INTO\s+dictionnaire_informatique/i.test(trimmed)) return null;

  const match = trimmed.match(/VALUES\s*\((.*)\)\s*;?\s*$/i);
  if (!match) return null;

  const values = splitSqlValues(match[1]);
  if (values.length < 5) return null;

  const termValue = values[1];
  const typeValue = values[2];
  const definitionValue = values[3];
  const exampleValue = values[4];

  const term = termValue.startsWith("'") ? unescapeSqlStringLiteral(termValue.slice(1, -1)) : String(termValue);
  const kindRaw = typeValue.startsWith("'") ? unescapeSqlStringLiteral(typeValue.slice(1, -1)) : String(typeValue);
  const definition = definitionValue.startsWith("'") ? unescapeSqlStringLiteral(definitionValue.slice(1, -1)) : String(definitionValue);
  const example = exampleValue === 'NULL'
    ? null
    : (exampleValue.startsWith("'") ? unescapeSqlStringLiteral(exampleValue.slice(1, -1)) : String(exampleValue));

  return {
    term: String(term || '').trim(),
    kind: mapKind(kindRaw),
    definition: String(definition || '').trim(),
    example: example ? String(example).trim() : null
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const inputPath = argv.find((a) => !a.startsWith('--')) || '';
  const dryRun = argv.includes('--dry-run');

  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL manquant. Exemple: set DATABASE_URL=postgresql://...');
    process.exit(1);
  }

  if (!inputPath) {
    console.error('Chemin du fichier SQL requis. Exemple: node scripts/import-informatics-dictionary-sql.js C:\\\\path\\\\file.sql');
    process.exit(1);
  }

  const resolved = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolved)) {
    console.error(`Fichier introuvable: ${resolved}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(resolved, 'utf8');
  const lines = raw.split(/\r?\n/);

  const parsed = [];
  for (const line of lines) {
    const row = parseInsertLine(line);
    if (row && row.term && row.definition) parsed.push(row);
  }

  if (!parsed.length) {
    console.log('Aucune ligne INSERT valide trouvée.');
    return;
  }

  if (!prisma?.informaticsDictionaryTerm) {
    console.error(
      [
        'Prisma Client ne contient pas le modèle "InformaticsDictionaryTerm".',
        "Solution: exécute `npx prisma generate` (ou `npm run prisma:generate`) après avoir récupéré la dernière version du backend, puis relance l'import.",
        "Et assure-toi d'avoir appliqué les migrations (`npx prisma migrate deploy`)."
      ].join('\n')
    );
    process.exit(1);
  }

  console.log(`Trouvé ${parsed.length} termes à importer.`);
  if (dryRun) {
    console.log('Mode --dry-run: aucune écriture en base.');
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const row of parsed) {
    // Prevent obvious duplicates by exact match.
    const existing = await prisma.informaticsDictionaryTerm.findFirst({ where: { term: row.term } });
    if (existing) {
      skipped += 1;
      continue;
    }

    const createdRow = await prisma.informaticsDictionaryTerm.create({
      data: {
        term: row.term,
        kind: row.kind,
        definition: row.definition,
        example: row.example,
        letterIndex: letterIndexFrom(row.term),
        createdById: null
      }
    });

    // Best effort indexing (table might be empty in older deployments).
    await prisma.searchIndex.create({
      data: {
        title: createdRow.term,
        type: 'DICTIONNAIRE',
        category: 'Dictionnaire Informatique',
        referenceId: createdRow.id
      }
    }).catch(() => {});

    created += 1;
    if (created % 100 === 0) {
      console.log(`... ${created} importés`);
    }
  }

  console.log(`Import terminé. Créés=${created}, ignorés=${skipped}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch (_) {}
  });
