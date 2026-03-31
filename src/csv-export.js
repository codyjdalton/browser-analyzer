const fs = require('fs');

const HEADERS = [
  'URL',
  'Title',
  'Visit Time',
  'Visit Count',
  'Visited From',
  'Visit Type',
  'Visit Duration',
  'Web Browser',
  'User Profile',
  'Browser Profile',
  'URL Length',
  'Typed Count',
  'History File',
  'Record ID',
];

const FIELD_KEYS = [
  'url',
  'title',
  'visitTime',
  'visitCount',
  'visitedFrom',
  'visitType',
  'visitDuration',
  'webBrowser',
  'userProfile',
  'browserProfile',
  'urlLength',
  'typedCount',
  'historyFile',
  'recordId',
];

function escapeCsvField(value) {
  const str = String(value ?? '');
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function exportToCsv(filePath, rows, headers, fieldKeys) {
  const h = headers || HEADERS;
  const k = fieldKeys || FIELD_KEYS;
  const lines = [h.map(escapeCsvField).join(',')];
  for (const row of rows) {
    const values = k.map((key) => escapeCsvField(row[key]));
    lines.push(values.join(','));
  }
  fs.writeFileSync(filePath, lines.join('\r\n') + '\r\n', 'utf8');
  return rows.length;
}

module.exports = { exportToCsv };
