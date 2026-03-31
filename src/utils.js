const CHROME_EPOCH_OFFSET = 11644473600000000n;

const TRANSITION_TYPES = [
  'LINK',
  'TYPED',
  'AUTO_BOOKMARK',
  'AUTO_SUBFRAME',
  'MANUAL_SUBFRAME',
  'GENERATED',
  'AUTO_TOPLEVEL',
  'FORM_SUBMIT',
  'RELOAD',
  'KEYWORD',
  'KEYWORD_GENERATED',
];

function chromeTimeToDate(chromeTimestamp) {
  if (!chromeTimestamp || chromeTimestamp === 0) return null;
  const ts = BigInt(chromeTimestamp);
  const unixMicro = ts - CHROME_EPOCH_OFFSET;
  const unixMs = Number(unixMicro / 1000n);
  return new Date(unixMs);
}

function dateToChromeTime(date) {
  if (!date) return 0;
  const unixMs = BigInt(date.getTime());
  const unixMicro = unixMs * 1000n;
  return Number(unixMicro + CHROME_EPOCH_OFFSET);
}

function formatDateTime(date) {
  if (!date) return '';
  return date.toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatDuration(microseconds) {
  if (!microseconds || microseconds === 0) return '';
  const totalSeconds = Math.floor(microseconds / 1000000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function decodeTransition(value) {
  const coreType = value & 0xff;
  return TRANSITION_TYPES[coreType] || '';
}

// Firefox uses microseconds since Unix epoch
function firefoxTimeToDate(microseconds) {
  if (!microseconds || microseconds === 0) return null;
  return new Date(microseconds / 1000);
}

function dateToFirefoxTime(date) {
  if (!date) return 0;
  return date.getTime() * 1000;
}

const FIREFOX_TRANSITION_TYPES = [
  '',              // 0 - unused
  'LINK',          // 1
  'TYPED',         // 2
  'AUTO_BOOKMARK', // 3
  'EMBED',         // 4
  'RELOAD',        // 5
  'REDIRECT',      // 6
  'HISTORY',       // 7
  'SEARCH',        // 8
  'BOOKMARK',      // 9
];

function decodeFirefoxTransition(value) {
  return FIREFOX_TRANSITION_TYPES[value] || '';
}

const SEARCH_PATTERNS = [
  { pattern: /google\.\w+\/search/, param: 'q', site: 'Google' },
  { pattern: /bing\.com\/search/, param: 'q', site: 'Bing' },
  { pattern: /duckduckgo\.com\//, param: 'q', site: 'DuckDuckGo' },
  { pattern: /search\.yahoo\.com\/search/, param: 'p', site: 'Yahoo' },
  { pattern: /search\.brave\.com\/search/, param: 'q', site: 'Brave Search' },
  { pattern: /youtube\.com\/results/, param: 'search_query', site: 'YouTube' },
  { pattern: /amazon\.\w+\/s/, param: 'k', site: 'Amazon' },
  { pattern: /reddit\.com\/search/, param: 'q', site: 'Reddit' },
  { pattern: /baidu\.com\/s/, param: 'wd', site: 'Baidu' },
  { pattern: /yandex\.\w+\/search/, param: 'text', site: 'Yandex' },
];

function extractSearchInfo(urlStr) {
  try {
    const url = new URL(urlStr);
    for (const { pattern, param, site } of SEARCH_PATTERNS) {
      if (pattern.test(urlStr)) {
        const term = url.searchParams.get(param);
        if (term) {
          return { site, searchTerm: decodeURIComponent(term.replace(/\+/g, ' ')) };
        }
      }
    }
  } catch {}
  return null;
}

module.exports = {
  chromeTimeToDate,
  dateToChromeTime,
  formatDateTime,
  formatDuration,
  decodeTransition,
  firefoxTimeToDate,
  dateToFirefoxTime,
  decodeFirefoxTransition,
  extractSearchInfo,
};
