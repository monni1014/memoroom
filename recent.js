const fs = require('fs');
const path = require('path');

function getRecentFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === '.next' || file === '.git') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getRecentFiles(fullPath, files);
    } else {
      if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.md')) {
        files.push({ path: fullPath, mtime: stat.mtime });
      }
    }
  }
  return files;
}

const recent = getRecentFiles(process.cwd())
  .sort((a, b) => b.mtime - a.mtime)
  .slice(0, 10);

console.log(recent);
