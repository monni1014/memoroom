const fs = require('fs');
const path = require('path');

function getRecentFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file === '.next' || file === '.git' || file === 'recent.js') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getRecentFiles(fullPath, files);
    } else {
      files.push({ path: fullPath, mtime: stat.mtime });
    }
  }
  return files;
}

const recent = getRecentFiles(path.join(process.cwd(), 'src'))
  .sort((a, b) => b.mtime - a.mtime)
  .slice(0, 15)
  .map(f => `${f.mtime.toISOString()} - ${f.path}`)
  .join('\n');

fs.writeFileSync('recent_files.txt', recent);
