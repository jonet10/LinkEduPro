const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Config des fichiers à commiter
const defaultFiles = [
  'frontend/src/app/school-management/payments/page.js'
];

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('\n🚀 Démarrage du processus de commit et push...\n');

  // Demander le message de commit
  const message = await prompt('💬 Message de commit (défaut: "feat: mise à jour LinkEduPro"): ');
  const commitMessage = message.trim() || 'feat: mise à jour LinkEduPro';

  // Demander les fichiers à ajouter
  console.log('\n📁 Fichiers par défaut:');
  defaultFiles.forEach(f => console.log(`  - ${f}`));
  const customFiles = await prompt('\n📝 Fichiers supplémentaires (séparés par virgule, ou appuyez sur Entrée): ');

  const files = [...defaultFiles];
  if (customFiles.trim()) {
    const additional = customFiles.split(',').map(f => f.trim()).filter(f => f);
    files.push(...additional);
  }

  console.log('\n📊 Changements à commiter:');
  try {
    // Ajouter les fichiers
    console.log('📁 Ajout des fichiers...');
    files.forEach(file => {
      try {
        execSync(`git add "${file}"`, { encoding: 'utf8' });
      } catch (e) {
        console.log(`⚠️  Impossible d'ajouter ${file}`);
      }
    });

    // Afficher le statut
    try {
      const diff = execSync('git diff --cached --stat', { encoding: 'utf8' });
      console.log(diff);
    } catch (_) {}

    // Demander confirmation
    const confirm = await prompt('\n✅ Continuer avec le commit ? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('❌ Opération annulée.\n');
      rl.close();
      return;
    }

    // Commit
    console.log('\n💾 Création du commit...');
    const commitOutput = execSync(`git commit -m "${commitMessage}"`, { encoding: 'utf8' });
    console.log(commitOutput);

    // Push
    console.log('\n🌐 Push vers le serveur...');
    const pushOutput = execSync('git push origin main', { encoding: 'utf8' });
    console.log(pushOutput);

    console.log('\n✨ Succès ! Le code est maintenant sur GitHub.\n');
  } catch (error) {
    console.error('\n❌ Erreur:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main().catch(err => {
  console.error('Erreur:', err);
  process.exit(1);
});
