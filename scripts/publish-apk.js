const fs = require('fs');
const path = require('path');

function resolveVariant(arg) {
  const value = String(arg || 'debug').trim().toLowerCase();
  return value === 'release' ? 'release' : 'debug';
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function resolveApkSource(root, variant) {
  const outDir = path.join(root, 'android', 'app', 'build', 'outputs', 'apk', variant);
  const preferred = path.join(outDir, `app-${variant}.apk`);
  if (fs.existsSync(preferred)) return preferred;

  const files = fs.readdirSync(outDir).filter((name) => name.endsWith('.apk'));
  if (!files.length) {
    throw new Error(`Aucun APK trouve dans: ${outDir}`);
  }

  const unsigned = files.find((name) => name.includes('unsigned'));
  return path.join(outDir, unsigned || files[0]);
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
  const source = resolveApkSource(root, variant);
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
