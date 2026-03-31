const fs = require('fs');
const path = require('path');
const { chromeTimeToDate, formatDateTime } = require('./utils');

const ROOT_LABELS = {
  bookmark_bar: 'Bookmarks Bar',
  other: 'Other Bookmarks',
  synced: 'Mobile Bookmarks',
};

function readBookmarks(profiles) {
  const allBookmarks = [];

  for (const profile of profiles) {
    const bookmarksPath = path.join(path.dirname(profile.historyPath), 'Bookmarks');
    if (!fs.existsSync(bookmarksPath)) continue;

    try {
      const raw = fs.readFileSync(bookmarksPath, 'utf8');
      const data = JSON.parse(raw);
      const roots = data.roots || {};

      for (const [rootKey, rootNode] of Object.entries(roots)) {
        if (!rootNode || !rootNode.children) continue;
        const rootLabel = ROOT_LABELS[rootKey] || rootKey;
        flattenBookmarks(rootNode.children, rootLabel, profile, allBookmarks);
      }
    } catch {}
  }

  return allBookmarks;
}

function flattenBookmarks(children, folderPath, profile, result) {
  for (const item of children) {
    if (item.type === 'url') {
      const dateAdded = item.date_added ? chromeTimeToDate(Number(item.date_added)) : null;
      result.push({
        name: item.name || '',
        url: item.url || '',
        folder: folderPath,
        dateAdded: formatDateTime(dateAdded),
        webBrowser: profile.browser,
        browserProfile: profile.profileName,
      });
    } else if (item.type === 'folder' && item.children) {
      flattenBookmarks(item.children, folderPath + ' / ' + (item.name || 'Unnamed'), profile, result);
    }
  }
}

function readBookmarkFile(filePath, browser, profileName) {
  const result = [];
  const profile = { browser, profileName };

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    const roots = data.roots || {};

    for (const [rootKey, rootNode] of Object.entries(roots)) {
      if (!rootNode || !rootNode.children) continue;
      const rootLabel = ROOT_LABELS[rootKey] || rootKey;
      flattenBookmarks(rootNode.children, rootLabel, profile, result);
    }
  } catch {}

  return result;
}

module.exports = { readBookmarks, readBookmarkFile };
