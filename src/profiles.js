const fs = require('fs');
const path = require('path');
const os = require('os');

function discoverProfiles() {
  const results = [];
  const home = os.homedir();
  const isWindows = process.platform === 'win32';

  const browsers = isWindows ? [
    // Windows paths (under %LOCALAPPDATA%)
    { name: 'Brave', basePath: path.join(home, 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'User Data') },
    { name: 'Chrome', basePath: path.join(home, 'AppData', 'Local', 'Google', 'Chrome', 'User Data') },
    { name: 'Chromium', basePath: path.join(home, 'AppData', 'Local', 'Chromium', 'User Data') },
    { name: 'Edge', basePath: path.join(home, 'AppData', 'Local', 'Microsoft', 'Edge', 'User Data') },
    { name: 'Opera', basePath: path.join(home, 'AppData', 'Roaming', 'Opera Software', 'Opera Stable') },
  ] : [
    // Linux paths (native, Flatpak, Snap)
    { name: 'Brave', basePath: path.join(home, '.config', 'BraveSoftware', 'Brave-Browser') },
    { name: 'Brave', basePath: path.join(home, '.var', 'app', 'com.brave.Browser', 'config', 'BraveSoftware', 'Brave-Browser') },
    { name: 'Brave', basePath: path.join(home, 'snap', 'brave', 'current', '.config', 'BraveSoftware', 'Brave-Browser') },
    { name: 'Chrome', basePath: path.join(home, '.config', 'google-chrome') },
    { name: 'Chrome', basePath: path.join(home, '.var', 'app', 'com.google.Chrome', 'config', 'google-chrome') },
    { name: 'Chrome', basePath: path.join(home, 'snap', 'google-chrome', 'current', '.config', 'google-chrome') },
    { name: 'Chromium', basePath: path.join(home, '.config', 'chromium') },
    { name: 'Chromium', basePath: path.join(home, '.var', 'app', 'org.chromium.Chromium', 'config', 'chromium') },
    { name: 'Chromium', basePath: path.join(home, 'snap', 'chromium', 'current', '.config', 'chromium') },
    { name: 'Edge', basePath: path.join(home, '.config', 'microsoft-edge') },
    { name: 'Edge', basePath: path.join(home, '.var', 'app', 'com.microsoft.Edge', 'config', 'microsoft-edge') },
    { name: 'Edge', basePath: path.join(home, 'snap', 'microsoft-edge', 'current', '.config', 'microsoft-edge') },
    { name: 'Opera', basePath: path.join(home, '.config', 'opera') },
    { name: 'Opera', basePath: path.join(home, '.var', 'app', 'com.opera.Opera', 'config', 'opera') },
    { name: 'Opera', basePath: path.join(home, 'snap', 'opera', 'current', '.config', 'opera') },
  ];

  // Chromium-based browsers
  for (const browser of browsers) {
    if (!fs.existsSync(browser.basePath)) continue;

    const entries = fs.readdirSync(browser.basePath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const historyPath = path.join(browser.basePath, entry.name, 'History');
      if (fs.existsSync(historyPath)) {
        results.push({
          browser: browser.name,
          engine: 'chromium',
          profileName: entry.name,
          historyPath,
        });
      }
    }
  }

  // Firefox — profile dirs are like "abc123.default", use full dir name to avoid dupes
  const firefoxPaths = isWindows ? [
    path.join(home, 'AppData', 'Roaming', 'Mozilla', 'Firefox', 'Profiles'),
  ] : [
    path.join(home, '.mozilla', 'firefox'),
    path.join(home, '.var', 'app', 'org.mozilla.firefox', '.mozilla', 'firefox'),
    path.join(home, 'snap', 'firefox', 'common', '.mozilla', 'firefox'),
  ];

  const seenFF = new Set();
  for (const ffBase of firefoxPaths) {
    if (!fs.existsSync(ffBase)) continue;

    const entries = fs.readdirSync(ffBase, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const placesPath = path.join(ffBase, entry.name, 'places.sqlite');
      if (fs.existsSync(placesPath)) {
        if (seenFF.has(entry.name)) continue;
        seenFF.add(entry.name);

        results.push({
          browser: 'Firefox',
          engine: 'firefox',
          profileName: entry.name,
          historyPath: placesPath,
        });
      }
    }
  }

  return results;
}

module.exports = { discoverProfiles };
