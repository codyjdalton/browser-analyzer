const fs = require('fs');
const path = require('path');

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const src = path.join(__dirname, '..', 'build', 'win-native', 'better_sqlite3.node');
  const destDir = path.join(context.appOutDir, 'resources', 'app.asar.unpacked', 'node_modules', 'better-sqlite3', 'build', 'Release');
  const dest = path.join(destDir, 'better_sqlite3.node');

  if (!fs.existsSync(src)) {
    throw new Error('Win32 better_sqlite3.node not found. Run "node scripts/fetch-win-native.js" first.');
  }

  fs.mkdirSync(destDir, { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`Copied win32 better_sqlite3.node to ${dest}`);
};
