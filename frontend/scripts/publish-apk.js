const fs = require('fs');
const path = require('path');

function resolveVariant(arg) {
  const value = String(arg || 'debug').trim().toLowerCase();
  return value === 'release' ? 'release' : 'debug';
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFileOrThrow(source, target) {
  if (!fs.existsSync(source)) {
    throw new Error(`APK source introuvable: ${source}`);
  }
  fs.copyFileSync(source, target);
}

function writeJson(file, payload) {
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
}

function main() {
  const variant = resolveVariant(process.argv[2]);
  const root = process.cwd();
  const source = path.join(
    root,
    'android',
    'app',
    'build',
    'outputs',
    'apk',
    variant,
    `app-${variant}.apk`
  );
  const targetDir = path.join(root, 'public', 'apk');
  const targetStable = path.join(targetDir, 'linkedupro.apk');
  const targetVersioned = path.join(targetDir, `linkedupro-${variant}.apk`);
  const manifestPath = path.join(targetDir, 'latest.json');

  ensureDir(targetDir);
  copyFileOrThrow(source, targetStable);
  copyFileOrThrow(source, targetVersioned);

  const stats = fs.statSync(targetStable);
  const manifest = {
    file: '/apk/linkedupro.apk',
    variant,
    size: stats.size,
    updatedAt: new Date().toISOString()
  };
  writeJson(manifestPath, manifest);

  console.log(`APK publie: ${targetStable}`);
  console.log(`Copie variante: ${targetVersioned}`);
  console.log(`Manifest: ${manifestPath}`);
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exit(1);
}
