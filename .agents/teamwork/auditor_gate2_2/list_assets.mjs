import fs from 'fs';
import path from 'path';

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
for (const f of allAssetFiles) {
  const rel = path.relative(rootDir, f).replace(/\\/g, '/');
  console.log(rel, fs.statSync(f).size);
}
