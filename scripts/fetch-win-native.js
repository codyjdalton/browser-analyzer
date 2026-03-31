const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const electronPkg = require(path.join(__dirname, '..', 'node_modules', 'electron', 'package.json'));
const electronVersion = electronPkg.version;
const sqliteDir = path.join(__dirname, '..', 'node_modules', 'better-sqlite3');
const stashDir = path.join(__dirname, '..', 'build', 'win-native');

console.log(`Fetching better-sqlite3 win32-x64 prebuild for Electron ${electronVersion}...`);
execSync(
  `npx prebuild-install --platform win32 --arch x64 -r electron -t ${electronVersion}`,
  { cwd: sqliteDir, stdio: 'inherit' }
);

// Stash the Windows binary so it doesn't get overwritten by Linux rebuild
const src = path.join(sqliteDir, 'build', 'Release', 'better_sqlite3.node');
fs.mkdirSync(stashDir, { recursive: true });
fs.copyFileSync(src, path.join(stashDir, 'better_sqlite3.node'));
console.log(`Stashed win32 binary to ${stashDir}`);

// Restore the Linux binary by rebuilding for the host
console.log('Rebuilding better-sqlite3 for host platform...');
execSync(
  `npx prebuild-install -r electron -t ${electronVersion}`,
  { cwd: sqliteDir, stdio: 'inherit' }
);
console.log('Done.');
