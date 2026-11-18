import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const rootDir = 'c:/Users/tn018/Desktop/Person/media/tiktok/app-live';
const assetsDir = path.join(rootDir, 'assets');

function getFilesRecursively(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getFilesRecursively(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

const allAssetFiles = getFilesRecursively(assetsDir);
console.log('Total files found in assets/:', allAssetFiles.length);

const hashes = new Map();
const duplicates = [];

for (const file of allAssetFiles) {
  const rel = path.relative(rootDir, file).replace(/\\/g, '/');
  const buf = fs.readFileSync(file);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  if (hashes.has(hash)) {
    duplicates.push({ file: rel, duplicateOf: hashes.get(hash), hash });
  } else {
    hashes.set(hash, rel);
  }
}

console.log('Unique hashes:', hashes.size);
console.log('Duplicates:', duplicates);
