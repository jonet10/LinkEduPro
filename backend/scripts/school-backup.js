const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const outDir = path.resolve(__dirname, '../backups');
fs.mkdirSync(outDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outFile = path.join(outDir, `school-management-${stamp}.sql`);

const tables = [
  '"School"',
  '"SchoolAdmin"',
  '"SchoolAcademicYear"',
  '"SchoolClass"',
  '"SchoolStudent"',
  '"SchoolPaymentType"',
  '"SchoolPayment"',
  '"SchoolLog"'
];

const tableArgs = tables.map((t) => `-t ${t}`).join(' ');
const command = `pg_dump "${databaseUrl}" --no-owner --no-privileges ${tableArgs} > "${outFile}"`;

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error('Backup failed:', stderr || error.message);
    process.exit(1);
  }

  console.log(`Backup created: ${outFile}`);
  if (stdout) {
    console.log(stdout);
  }
});
