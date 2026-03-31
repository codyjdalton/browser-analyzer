const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const { discoverProfiles } = require('./src/profiles');
const {
  queryHistory, querySearchTerms,
  queryFirefoxHistory, queryFirefoxSearchTerms, queryFirefoxBookmarks,
  flagRows,
  flagSearches,
} = require('./src/db');
const { extractSearchInfo } = require('./src/utils');
const { readBookmarks, readBookmarkFile } = require('./src/bookmarks');
const { exportToCsv } = require('./src/csv-export');
const fs = require('fs');
const Database = require('better-sqlite3');

// Parse "YYYY-MM-DD" as local time (not UTC)
function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    icon: path.join(__dirname, 'AppIcon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

ipcMain.handle('get-profiles', () => {
  return discoverProfiles();
});

function addSearchFromUrl(row, seen, results) {
  const info = extractSearchInfo(row.url);
  if (info) {
    const key = info.searchTerm.toLowerCase() + '|' + row.url;
    if (!seen.has(key)) {
      seen.add(key);
      results.push({
        searchTerm: info.searchTerm, site: info.site, url: row.url,
        visitTime: row.visitTime, webBrowser: row.webBrowser, browserProfile: row.browserProfile,
      });
    }
  }
}

function addDbSearch(s, seen, results) {
  const key = s.searchTerm.toLowerCase() + '|' + s.url;
  if (!seen.has(key)) { seen.add(key); results.push(s); }
}

ipcMain.handle('load-history', (_event, options) => {
  const { profiles, startDate, endDate } = options;
  const allRows = [];

  const start = startDate ? parseLocalDate(startDate) : null;
  const end = parseLocalDate(endDate);
  end.setHours(23, 59, 59, 999);

  for (const profile of profiles) {
    const fn = profile.engine === 'firefox' ? queryFirefoxHistory : queryHistory;
    allRows.push(...fn(profile, start, end));
  }

  allRows.sort((a, b) => new Date(b.visitTime) - new Date(a.visitTime));
  return allRows;
});

ipcMain.handle('load-searches', (_event, options) => {
  const { profiles, startDate, endDate, historyRows } = options;
  const allSearches = [];
  const seen = new Set();

  const start = startDate ? parseLocalDate(startDate) : null;
  const end = parseLocalDate(endDate);
  end.setHours(23, 59, 59, 999);

  for (const profile of profiles) {
    const fn = profile.engine === 'firefox' ? queryFirefoxSearchTerms : querySearchTerms;
    for (const s of fn(profile, start, end)) addDbSearch(s, seen, allSearches);
  }

  if (historyRows) {
    for (const row of historyRows) addSearchFromUrl(row, seen, allSearches);
  }

  allSearches.sort((a, b) => new Date(b.visitTime) - new Date(a.visitTime));
  return allSearches;
});

ipcMain.handle('load-bookmarks', (_event, profiles) => {
  const allBookmarks = [];

  // Chromium bookmarks (JSON file)
  const chromiumProfiles = profiles.filter(p => p.engine !== 'firefox');
  if (chromiumProfiles.length > 0) {
    allBookmarks.push(...readBookmarks(chromiumProfiles));
  }

  // Firefox bookmarks (from places.sqlite)
  for (const profile of profiles.filter(p => p.engine === 'firefox')) {
    allBookmarks.push(...queryFirefoxBookmarks(profile));
  }

  return allBookmarks;
});

ipcMain.handle('open-single-file-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select File',
    properties: ['openFile'],
    filters: [{ name: 'All Files', extensions: ['*'] }],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('load-uploaded', (_event, options) => {
  const { slots, startDate, endDate } = options;

  const start = startDate ? parseLocalDate(startDate) : null;
  const end = parseLocalDate(endDate);
  end.setHours(23, 59, 59, 999);

  const allHistory = [];
  const allBookmarks = [];
  const allSearches = [];
  const seen = new Set();

  for (const slot of slots) {
    const engine = slot.engine || 'chromium';

    if (slot.historyFile) {
      const profile = {
        browser: slot.browser,
        profileName: slot.profileName,
        engine,
        historyPath: slot.historyFile,
      };

      const histFn = engine === 'firefox' ? queryFirefoxHistory : queryHistory;
      const searchFn = engine === 'firefox' ? queryFirefoxSearchTerms : querySearchTerms;

      const rows = histFn(profile, start, end);
      allHistory.push(...rows);

      for (const s of searchFn(profile, start, end)) addDbSearch(s, seen, allSearches);
      for (const row of rows) addSearchFromUrl(row, seen, allSearches);

      // Firefox bookmarks are in the same DB
      if (engine === 'firefox') {
        allBookmarks.push(...queryFirefoxBookmarks(profile));
      }
    }

    if (slot.bookmarksFile) {
      if (engine === 'firefox') {
        // Firefox bookmarks are in places.sqlite, handled above
      } else {
        const bmarks = readBookmarkFile(slot.bookmarksFile, slot.browser, slot.profileName);
        allBookmarks.push(...bmarks);
      }
    }
  }

  allHistory.sort((a, b) => new Date(b.visitTime) - new Date(a.visitTime));
  allSearches.sort((a, b) => new Date(b.visitTime) - new Date(a.visitTime));

  return { history: allHistory, searches: allSearches, bookmarks: allBookmarks };
});

ipcMain.handle('flag-rows', async (_event, rows) => {
  return await flagRows(rows);
});

ipcMain.handle('flag-searches', async (_event, rows) => {
  return await flagSearches(rows);
});

ipcMain.handle('export-csv', async (_event, { rows, headers, fieldKeys }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Browser History',
    defaultPath: 'browser-history.csv',
    filters: [{ name: 'CSV Files', extensions: ['csv'] }],
  });

  if (result.canceled) return { success: false, canceled: true };

  const count = exportToCsv(result.filePath, rows, headers, fieldKeys);
  return { success: true, filePath: result.filePath, count };
});
