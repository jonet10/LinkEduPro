const fs = require('fs');
const path = require('path');

function getStorageRoot() {
  const configured = process.env.STORAGE_ROOT && String(process.env.STORAGE_ROOT).trim();
  if (configured) {
    return path.resolve(configured);
  }
  return path.resolve(__dirname, '../../storage');
}

function resolveStoragePath(...segments) {
  return path.resolve(getStorageRoot(), ...segments);
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

module.exports = {
  getStorageRoot,
  resolveStoragePath,
  ensureDir
};

