const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const os = require('os');
const {
  chromeTimeToDate,
  dateToChromeTime,
  formatDateTime,
  formatDuration,
  decodeTransition,
  firefoxTimeToDate,
  dateToFirefoxTime,
  decodeFirefoxTransition,
  extractSearchInfo,
} = require('./utils');

function withTempDb(label, historyPath, queryFn) {
  const tmpDb = path.join(os.tmpdir(), `${label}_${Date.now()}`) + '.db';
  try {
    fs.copyFileSync(historyPath, tmpDb);
    if (fs.existsSync(historyPath + '-wal')) fs.copyFileSync(historyPath + '-wal', tmpDb + '-wal');
    if (fs.existsSync(historyPath + '-shm')) fs.copyFileSync(historyPath + '-shm', tmpDb + '-shm');
    const db = new Database(tmpDb, { readonly: true, fileMustExist: true });
    try { return queryFn(db); } finally { db.close(); }
  } finally {
    try { fs.unlinkSync(tmpDb); } catch {}
    try { fs.unlinkSync(tmpDb + '-wal'); } catch {}
    try { fs.unlinkSync(tmpDb + '-shm'); } catch {}
  }
}

function dedupSearchRows(rows, termField, mapRow) {
  const seen = new Set();
  const results = [];
  for (const row of rows) {
    const key = (row[termField] || '').toLowerCase() + '|' + row.url;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(mapRow(row));
  }
  return results;
}

const QUERY = `
SELECT
  v.id AS record_id,
  u.url,
  u.title,
  v.visit_time,
  u.visit_count,
  v.from_visit,
  v.transition,
  v.visit_duration,
  u.typed_count,
  fv_url.url AS from_url
FROM visits v
JOIN urls u ON v.url = u.id
LEFT JOIN visits fv ON v.from_visit = fv.id AND v.from_visit != 0
LEFT JOIN urls fv_url ON fv.url = fv_url.id
WHERE v.visit_time >= ? AND v.visit_time <= ?
ORDER BY v.visit_time DESC
`;

function queryHistory(profile, startDate, endDate) {
  return withTempDb('history', profile.historyPath, (db) => {
    const startChromeTime = startDate ? dateToChromeTime(startDate) : 0;
    const endChromeTime = dateToChromeTime(endDate);
    const rows = db.prepare(QUERY).all(startChromeTime, endChromeTime);
    const username = os.userInfo().username;

    return rows.map((row) => ({
      url: row.url || '',
      title: row.title || '',
      visitTime: formatDateTime(chromeTimeToDate(row.visit_time)),
      visitCount: row.visit_count,
      visitedFrom: row.from_url || '',
      visitType: decodeTransition(row.transition),
      visitDuration: formatDuration(row.visit_duration),
      webBrowser: profile.browser,
      userProfile: username,
      browserProfile: profile.profileName,
      urlLength: (row.url || '').length,
      typedCount: row.typed_count,
      historyFile: profile.historyPath,
      recordId: row.record_id,
      visitDurationMicro: row.visit_duration || 0,
      flagged: false,
    }));
  });
}

const SEARCH_QUERY = `
SELECT
  k.term,
  u.url,
  v.visit_time
FROM keyword_search_terms k
JOIN urls u ON k.url_id = u.id
JOIN visits v ON v.url = u.id
WHERE v.visit_time >= ? AND v.visit_time <= ?
ORDER BY v.visit_time DESC
`;

function querySearchTerms(profile, startDate, endDate) {
  return withTempDb('search', profile.historyPath, (db) => {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='keyword_search_terms'").get();
    if (!tableCheck) return [];

    const startChromeTime = startDate ? dateToChromeTime(startDate) : 0;
    const endChromeTime = dateToChromeTime(endDate);
    const rows = db.prepare(SEARCH_QUERY).all(startChromeTime, endChromeTime);

    return dedupSearchRows(rows, 'term', (row) => {
      const info = extractSearchInfo(row.url);
      return {
        searchTerm: row.term || '',
        site: info ? info.site : '',
        url: row.url || '',
        visitTime: formatDateTime(chromeTimeToDate(row.visit_time)),
        webBrowser: profile.browser,
        browserProfile: profile.profileName,
      };
    });
  });
}

// ── Firefox Queries ──

const FF_QUERY = `
SELECT
  hv.id AS record_id,
  p.url,
  p.title,
  hv.visit_date,
  p.visit_count,
  hv.from_visit,
  hv.visit_type,
  fv_place.url AS from_url,
  COALESCE(pm.total_view_time, 0) AS view_time
FROM moz_historyvisits hv
JOIN moz_places p ON hv.place_id = p.id
LEFT JOIN moz_historyvisits fv ON hv.from_visit = fv.id AND hv.from_visit != 0
LEFT JOIN moz_places fv_place ON fv.place_id = fv_place.id
LEFT JOIN moz_places_metadata pm ON pm.place_id = p.id
WHERE hv.visit_date >= ? AND hv.visit_date <= ?
ORDER BY hv.visit_date DESC
`;

function queryFirefoxHistory(profile, startDate, endDate) {
  return withTempDb('ff_history', profile.historyPath, (db) => {
    const startTime = startDate ? dateToFirefoxTime(startDate) : 0;
    const endTime = dateToFirefoxTime(endDate);
    const rows = db.prepare(FF_QUERY).all(startTime, endTime);
    const username = os.userInfo().username;

    return rows.map((row) => ({
      url: row.url || '',
      title: row.title || '',
      visitTime: formatDateTime(firefoxTimeToDate(row.visit_date)),
      visitCount: row.visit_count,
      visitedFrom: row.from_url || '',
      visitType: decodeFirefoxTransition(row.visit_type),
      visitDuration: row.view_time > 0 ? formatDuration(row.view_time * 1000) : '',
      webBrowser: profile.browser,
      userProfile: username,
      browserProfile: profile.profileName,
      urlLength: (row.url || '').length,
      typedCount: 0,
      historyFile: profile.historyPath,
      recordId: row.record_id,
      visitDurationMicro: row.view_time * 1000 || 0,
      flagged: false,
    }));
  });
}

const FF_SEARCH_QUERY = `
SELECT
  sq.terms,
  p.url,
  pm.created_at
FROM moz_places_metadata pm
JOIN moz_places_metadata_search_queries sq ON pm.search_query_id = sq.id
JOIN moz_places p ON pm.place_id = p.id
WHERE pm.created_at >= ? AND pm.created_at <= ?
ORDER BY pm.created_at DESC
`;

function queryFirefoxSearchTerms(profile, startDate, endDate) {
  return withTempDb('ff_search', profile.historyPath, (db) => {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='moz_places_metadata_search_queries'").get();
    if (!tableCheck) return [];

    const startTime = startDate ? dateToFirefoxTime(startDate) : 0;
    const endTime = dateToFirefoxTime(endDate);
    const rows = db.prepare(FF_SEARCH_QUERY).all(startTime, endTime);

    return dedupSearchRows(rows, 'terms', (row) => {
      const info = extractSearchInfo(row.url);
      return {
        searchTerm: row.terms || '',
        site: info ? info.site : '',
        url: row.url || '',
        visitTime: formatDateTime(firefoxTimeToDate(row.created_at)),
        webBrowser: profile.browser,
        browserProfile: profile.profileName,
      };
    });
  });
}

function queryFirefoxBookmarks(profile) {
  return withTempDb('ff_bookmarks', profile.historyPath, (db) => {
    const folders = {};
    const folderRows = db.prepare("SELECT id, title, parent FROM moz_bookmarks WHERE type = 2").all();
    for (const f of folderRows) {
      folders[f.id] = { title: f.title || '', parent: f.parent };
    }

    function getFolderPath(parentId) {
      const parts = [];
      let current = parentId;
      while (current && folders[current]) {
        if (folders[current].title) parts.unshift(folders[current].title);
        current = folders[current].parent;
      }
      return parts.join(' / ') || 'Root';
    }

    const rows = db.prepare(`
      SELECT b.title, p.url, b.dateAdded, b.parent
      FROM moz_bookmarks b
      JOIN moz_places p ON b.fk = p.id
      WHERE b.type = 1
      ORDER BY b.dateAdded DESC
    `).all();

    return rows.map((row) => ({
      name: row.title || '',
      url: row.url || '',
      folder: getFolderPath(row.parent),
      dateAdded: formatDateTime(firefoxTimeToDate(row.dateAdded)),
      webBrowser: profile.browser,
      browserProfile: profile.profileName,
    }));
  });
}

// Custom suspicious words for forensic analysis
const CUSTOM_SUSPICIOUS_WORDS = [
  // ── Data exfiltration / file sharing ──
  'pastebin', 'pastee', 'hastebin', 'ghostbin', 'dpaste', 'justpaste',
  'rentry.co', 'paste.ee', 'controlc.com', 'defuse.ca/b/', 'privatebin',
  'file.io', 'transfer.sh', 'wetransfer', 'sendspace', 'mediafire',
  'mega.nz', 'anonfiles', 'gofile', 'catbox', 'litterbox',
  'dropmefiles', 'uploadfiles', 'filedropper',
  'pixeldrain', 'bayfiles', 'letsupload', 'krakenfiles',
  'workupload', 'filebin', 'sendgb', 'filemail', 'smash.gg',
  'temp.sh', '0x0.st', 'uguu.se', 'pomf.cat',
  'base64decode', 'base64encode', 'cyberchef',

  // ── Anonymous / privacy evasion ──
  'torproject', 'tails', 'whonix', 'i2p', 'lokinet',
  'protonmail', 'proton.me', 'tutanota', 'tuta.com',
  'guerrillamail', 'tempmail', 'throwaway',
  'temp-mail', 'fakemailgenerator', 'mailinator', 'yopmail',
  'sharklasers', 'guerrillamail', 'grr.la', 'dispostable',
  'emailondeck', 'tempinbox', 'burnermail', 'maildrop.cc',
  'anonymouse', 'hidemyass', 'hide.me', 'proxfree',
  'vpngate', 'openvpn', 'mullvad', 'windscribe',
  'proxychains', 'shadowsocks', 'psiphon',
  'browserleaks.com', 'ipleak.net', 'dnsleaktest',
  'whoer.net', 'amiunique.org',

  // ── Hacking / exploit tools & resources ──
  'exploit-db', 'exploitdb', 'rapid7', 'metasploit',
  'kali linux', 'parrot os', 'blackarch',
  'hackforums', 'nulled', 'cracked.io', 'raidforums',
  'breachforums', 'leakbase', 'ogusers',
  'keylogger', 'ratting', 'crypter', 'booter', 'stresser',
  'phishing', 'credential harvesting', 'brute force',
  'sqlmap', 'burpsuite', 'wireshark capture',
  'reverse shell', 'payload', 'backdoor',
  'privilege escalation', 'rootkit',
  'cobalt strike', 'havoc framework', 'sliver c2', 'brute ratel',
  'mimikatz', 'lazagne', 'hashcat', 'john the ripper',
  'impacket', 'bloodhound', 'sharphound',
  'nmap scan', 'masscan', 'shodan.io', 'censys.io',
  'nuclei scanner', 'nikto scan', 'gobuster', 'dirbuster',
  'revshells.com', 'pentestmonkey',
  'shell.oneliner', 'webshell', 'china chopper', 'c99shell',
  'powershell -enc', 'powershell -nop', 'invoke-expression',

  // ── Credential / data theft ──
  'stealer', 'credential dump', 'password dump',
  'combolist', 'dehashed', 'leakcheck', 'haveibeenpwned',
  'snusbase', 'intelx.io', 'intelligence x',
  'leak-lookup', 'breachdirectory', 'hudsonrock',
  'darkweb', 'dark web', 'onion link', '.onion',
  'bitcoin tumbler', 'bitcoin mixer', 'crypto mixer',
  'tornado cash', 'wasabi wallet', 'coinjoin',
  'monero', 'localmonero',

  // ── Suspicious file sharing / piracy ──
  'mega upload', 'zippy share', 'zippyshare',
  'uploaded.net', 'rapidgator', 'turbobit', 'nitroflare',
  'thepiratebay', 'pirate bay', '1337x', 'rarbg',
  'rutracker', 'nyaa.si', 'libgen', 'sci-hub',
  'fmovies', '123movies', 'putlocker',
  'warez', 'cracked software', 'keygen', 'serial key generator',
  'license key generator',

  // ── Social engineering ──
  'social engineer', 'pretexting', 'spearphish',
  'how to hack', 'hack tutorial', 'cracking tutorial',
  'evilginx', 'gophish', 'king phisher', 'setoolkit',
  'spoofed email', 'email spoof',
  'deepfake', 'voice clone',

  // ── Insider threat indicators ──
  'resignation letter', 'job application', 'indeed.com', 'linkedin.com/jobs',
  'glassdoor', 'competitor',
  'usb exfil', 'data exfiltration', 'steal data',
  'cover tracks', 'delete logs', 'clear history',
  'file shredder', 'evidence destroyer',
  'how to wipe', 'dban', 'eraser portable', 'bleachbit',
  'secure delete', 'sdelete', 'cipher /w',

  // ── Anti-forensics / evasion ──
  'anti-forensic', 'antiforensic', 'timestomp',
  'log cleaner', 'event log clear', 'clear event log',
  'ccleaner', 'privazer', 'privacy eraser',
  'usb history eraser', 'shellbag cleaner',
  'incognito mode detection', 'private browsing forensic',
  'detect keylogger', 'am i being monitored',
  'how to tell if computer is monitored',
  'disable antivirus', 'disable defender',
  'bypass uac', 'bypass firewall',
  'amsi bypass', 'etw bypass',

  // ── Malware related ──
  'malware', 'ransomware', 'trojan', 'worm',
  'virus total', 'virustotal', 'any.run', 'hybrid-analysis',
  'sandbox evasion', 'antivirus bypass', 'av bypass',
  'joesandbox', 'triage.home', 'app.any.run',
  'malwarebazaar', 'virusshare', 'vxunderground',
  'malpedia', 'bazaar.abuse.ch',
  'ransomware payment', 'decrypt files', 'ransom note',

  // ── Remote access / C2 infrastructure ──
  'ngrok', 'serveo', 'localtunnel', 'bore.pub',
  'portmap.io', 'pagekite', 'localhost.run',
  'discord webhook', 'telegram bot api',
  'pastebin raw', 'raw.githubusercontent',
  'interactsh', 'requestbin', 'webhook.site', 'pipedream',
  'duckdns', 'no-ip', 'dynu', 'freedns',
  'anydesk', 'teamviewer', 'rustdesk', 'meshcentral',
  'screenconnect', 'splashtop', 'getscreen',
  'tmate.io', 'remote.it',

  // ── Fraud / financial crime ──
  'carding', 'fullz', 'cvv shop', 'dumps shop',
  'fake id', 'fake identity', 'identity fraud',
  'money mule', 'money laundering',
  'tax evasion', 'wire fraud',
  'counterfeit', 'fake currency', 'fake bills',
  'sim swap', 'sim swapping', 'sim cloning',
  'skimmer', 'card skimmer', 'atm skimmer',
  'check fraud', 'refund fraud', 'return fraud',

  // ── Surveillance / stalking tools ──
  'phone tracker', 'gps tracker hidden',
  'spyware', 'stalkerware', 'mspy', 'flexispy',
  'cocospy', 'spyic', 'eyezy',
  'track someone', 'monitor phone',
  'read someone messages', 'hack whatsapp',
  'hack instagram', 'hack facebook', 'hack snapchat',
];

let badWordsRegex = null;

async function buildBadWordsRegex() {
  if (badWordsRegex) return badWordsRegex;
  const { Filter } = await import('bad-words');
  const f = new Filter();
  const allWords = [...f.list, ...CUSTOM_SUSPICIOUS_WORDS];
  const escaped = allWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  badWordsRegex = new RegExp('(?:\\b|[/_.?=])(' + escaped.join('|') + ')(?:\\b|[/_.?=&])', 'i');
  return badWordsRegex;
}

// Intent-based suspicious patterns — standalone phrases, no prefix required
const INTENT_PATTERNS = [
  // Criminal intent
  /get away with (?:crime|murder|stealing|it|theft)/i,
  /without getting caught/i,
  /without being detected/i,
  /without leaving (?:a trace|evidence|tracks)/i,
  /cover up (?:a crime|evidence|murder|theft)/i,
  /hide (?:the body|evidence|the evidence|a crime)/i,
  /destroy (?:evidence|the evidence|forensic)/i,
  // How-to crime
  /(?:how to|ways to|how can i|how do i|tutorial|guide|tips for) (?:steal|hack|break into|crack|bypass|forge|counterfeit|smuggle|launder|embezzle|extort|blackmail|bribe|kidnap|murder|kill|poison|bomb|vandalize|stalk|spy|wiretap|eavesdrop|impersonate|catfish|shoplift|rob|burglarize|pick a lock|disable alarm|hide money|cheat on|get away with)/i,
  // Acquisition of illegal items
  /(?:buy|sell|get|find|order) (?:drugs|weapons|guns|fake id|stolen|counterfeit|illegal)/i,
  /(?:dark web|darknet) (?:market|shop|buy|sell|drugs|weapons|links)/i,
  /(?:make|build|create|assemble|cook|brew) (?:a bomb|explosives|weapon|drugs|meth|poison|ricin|fentanyl)/i,
  /(?:hire|find) (?:a hitman|hacker|assassin)/i,
  // Shoplifting / theft
  /shoplifting (?:tips|tricks|guide|tutorial|methods|techniques)/i,
  /(?:steal from|rob|burglarize|break into) (?:a store|a house|a car|a bank|an atm|walmart|target|amazon)/i,
  // Academic dishonesty
  /(?:cheat on|answers for|hack) (?:exam|test|final|midterm|homework|assignment)/i,
  // Forgery
  /(?:fake|forge|falsify) (?:documents|passport|id|diploma|degree|signature|prescription)/i,
  // Standalone suspicious phrases
  /unethical life pro tips?/i,
  /illegal life pro tips?/i,
  /how to (?:get away with|cover up|hide evidence|destroy evidence|clean up after|disappear|vanish|fake your death)/i,
];

async function flagRows(rows) {
  const regex = await buildBadWordsRegex();
  for (const row of rows) {
    const urlMatch = regex.test(row.url) || regex.test(row.title);
    const intentMatch = INTENT_PATTERNS.some(p => p.test(row.url) || p.test(row.title));
    row.flagged = urlMatch || intentMatch;
  }
  return rows;
}

async function flagSearches(rows) {
  const regex = await buildBadWordsRegex();
  for (const row of rows) {
    const match = regex.test(row.url) || regex.test(row.searchTerm);
    const intentMatch = INTENT_PATTERNS.some(p => p.test(row.url) || p.test(row.searchTerm));
    row.flagged = match || intentMatch;
  }
  return rows;
}

module.exports = {
  queryHistory, querySearchTerms,
  queryFirefoxHistory, queryFirefoxSearchTerms, queryFirefoxBookmarks,
  flagRows,
  flagSearches,
};
