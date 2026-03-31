const PAGE_SIZE = 20;

// ── Column Definitions ──

const COLUMNS_URLS = [
  { key: 'url',            label: 'URL',             type: 'string' },
  { key: 'title',          label: 'Title',           type: 'string' },
  { key: 'visitTime',      label: 'Visit Time',      type: 'date' },
  { key: 'visitCount',     label: 'Visit Count',     type: 'number' },
  { key: 'visitedFrom',    label: 'Visited From',    type: 'string' },
  { key: 'visitType',      label: 'Visit Type',      type: 'string' },
  { key: 'visitDuration',  label: 'Visit Duration',  type: 'duration' },
  { key: 'webBrowser',     label: 'Web Browser',     type: 'string' },
  { key: 'userProfile',    label: 'User Profile',    type: 'string' },
  { key: 'browserProfile', label: 'Browser Profile', type: 'string' },
  { key: 'urlLength',      label: 'URL Length',       type: 'number' },
  { key: 'typedCount',     label: 'Typed Count',     type: 'number' },
  { key: 'historyFile',    label: 'History File',    type: 'string' },
  { key: 'recordId',       label: 'Record ID',       type: 'number' },
];

const COLUMNS_URLS_DEDUP = [
  { key: 'url',            label: 'URL',             type: 'string' },
  { key: 'title',          label: 'Title',           type: 'string' },
  { key: 'visitTime',      label: 'First Visit',     type: 'date' },
  { key: 'lastVisitTime',  label: 'Last Visit',      type: 'date' },
  { key: 'visitCount',     label: 'Visit Count',     type: 'number' },
  { key: 'visitedFrom',    label: 'Visited From',    type: 'string' },
  { key: 'visitType',      label: 'Visit Type',      type: 'string' },
  { key: 'visitDuration',  label: 'Total Duration',  type: 'duration' },
  { key: 'webBrowser',     label: 'Web Browser',     type: 'string' },
  { key: 'userProfile',    label: 'User Profile',    type: 'string' },
  { key: 'browserProfile', label: 'Browser Profile', type: 'string' },
  { key: 'urlLength',      label: 'URL Length',       type: 'number' },
  { key: 'typedCount',     label: 'Typed Count',     type: 'number' },
  { key: 'historyFile',    label: 'History File',    type: 'string' },
  { key: 'recordId',       label: 'Record ID',       type: 'number' },
];

const COLUMNS_SEARCHES = [
  { key: 'searchTerm',    label: 'Search Term', type: 'string' },
  { key: 'site',          label: 'Site',        type: 'string' },
  { key: 'visitTime',     label: 'Date',        type: 'date' },
  { key: 'webBrowser',    label: 'Browser',     type: 'string' },
  { key: 'url',           label: 'URL',         type: 'string' },
];

const COLUMNS_SEARCHES_DEDUP = [
  { key: 'searchTerm',    label: 'Search Term',  type: 'string' },
  { key: 'site',          label: 'Site',         type: 'string' },
  { key: 'hits',          label: 'Hits',         type: 'number' },
  { key: 'visitTime',     label: 'First Search', type: 'date' },
  { key: 'lastVisitTime', label: 'Last Search',  type: 'date' },
  { key: 'webBrowser',    label: 'Browser',      type: 'string' },
  { key: 'url',           label: 'URL',          type: 'string' },
];

const COLUMNS_BOOKMARKS = [
  { key: 'name',           label: 'Name',            type: 'string' },
  { key: 'url',            label: 'URL',             type: 'string' },
  { key: 'folder',         label: 'Folder',          type: 'string' },
  { key: 'dateAdded',      label: 'Date Added',      type: 'date' },
  { key: 'webBrowser',     label: 'Browser',         type: 'string' },
  { key: 'browserProfile', label: 'Profile',         type: 'string' },
];

// ── Tab State ──

const tabState = {
  urls: {
    data: [], displayed: [], page: 0,
    sortCol: null, sortDir: 'asc',
    headEl: null, bodyEl: null, containerEl: null,
    getColumns: () => dedupFilterActive ? COLUMNS_URLS_DEDUP : COLUMNS_URLS,
  },
  searches: {
    data: [], displayed: [], page: 0,
    sortCol: null, sortDir: 'asc',
    headEl: null, bodyEl: null, containerEl: null,
    getColumns: () => searchesDedupActive ? COLUMNS_SEARCHES_DEDUP : COLUMNS_SEARCHES,
  },
  bookmarks: {
    data: [], displayed: [], page: 0,
    sortCol: null, sortDir: 'asc',
    headEl: null, bodyEl: null, containerEl: null,
    getColumns: () => COLUMNS_BOOKMARKS,
  },
};

let activeTab = 'urls';
let profiles = [];
let suspiciousFilterActive = false;
let dedupFilterActive = false;
let searchesDedupActive = false;
let searchTerm = '';

// ── DOM Refs ──

const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const allTimeCheckbox = document.getElementById('allTime');
const profilesContainer = document.getElementById('profilesContainer');
const loadBtn = document.getElementById('loadBtn');
const resultsPanel = document.getElementById('resultsPanel');
const recordCount = document.getElementById('recordCount');
const exportBtn = document.getElementById('exportBtn');
const loadingOverlay = document.getElementById('loadingOverlay');
const statusText = document.getElementById('statusText');
const suspiciousCheckbox = document.getElementById('suspiciousFilter');
const suspiciousToggle = suspiciousCheckbox.closest('.filter-toggle');
const dedupCheckbox = document.getElementById('dedupFilter');
const searchInput = document.getElementById('searchInput');
const filterToggles = document.getElementById('filterToggles');
const searchesSearchEl = document.getElementById('searchesSearch');
const searchesSearchInput = document.getElementById('searchesSearchInput');
const bookmarksSearchEl = document.getElementById('bookmarksSearch');
const bookmarksSearchInput = document.getElementById('bookmarksSearchInput');
const analysisBar = document.getElementById('analysisBar');
const analysisLabel = document.getElementById('analysisLabel');
const analysisProgressFill = document.getElementById('analysisProgressFill');

// ── Init ──

function initTabElements() {
  tabState.urls.headEl = document.getElementById('urlsHead');
  tabState.urls.bodyEl = document.getElementById('urlsBody');
  tabState.urls.containerEl = document.getElementById('urlsContainer');
  tabState.searches.headEl = document.getElementById('searchesHead');
  tabState.searches.bodyEl = document.getElementById('searchesBody');
  tabState.searches.containerEl = document.getElementById('searchesContainer');
  tabState.bookmarks.headEl = document.getElementById('bookmarksHead');
  tabState.bookmarks.bodyEl = document.getElementById('bookmarksBody');
  tabState.bookmarks.containerEl = document.getElementById('bookmarksContainer');
}

initTabElements();
setDefaultDates();
loadProfiles();
buildTabHeader('urls');
buildTabHeader('searches');
buildTabHeader('bookmarks');

// ── Tab Switching ──

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

function switchTab(tabName) {
  activeTab = tabName;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
  for (const [name, state] of Object.entries(tabState)) {
    state.containerEl.style.display = name === tabName ? '' : 'none';
  }
  filterToggles.style.display = tabName === 'urls' ? '' : 'none';
  searchesSearchEl.style.display = tabName === 'searches' ? '' : 'none';
  bookmarksSearchEl.style.display = tabName === 'bookmarks' ? '' : 'none';
  renderTabPage(tabName);
}

// ── Dates ──

function setDefaultDates() {
  const today = new Date();
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(today.getFullYear() - 1);
  endDateInput.value = formatInputDate(today);
  startDateInput.value = formatInputDate(oneYearAgo);
}

function formatInputDate(d) {
  return d.toISOString().split('T')[0];
}

allTimeCheckbox.addEventListener('change', () => {
  startDateInput.disabled = allTimeCheckbox.checked;
  if (allTimeCheckbox.checked) {
    startDateInput.value = '';
  } else {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    startDateInput.value = formatInputDate(oneYearAgo);
  }
});

// ── URL-specific Filters ──

suspiciousCheckbox.addEventListener('change', () => {
  suspiciousFilterActive = suspiciousCheckbox.checked;
  applyUrlFilters();
  applySearchesFilters();
});

dedupCheckbox.addEventListener('change', () => {
  dedupFilterActive = dedupCheckbox.checked;
  buildTabHeader('urls');
  applyUrlFilters();
});

searchInput.addEventListener('input', () => {
  searchTerm = searchInput.value.trim().toLowerCase();
  applyUrlFilters();
});

// ── Searches & Bookmarks Search ──

const searchesDedupCheckbox = document.getElementById('searchesDedupFilter');

searchesDedupCheckbox.addEventListener('change', () => {
  searchesDedupActive = searchesDedupCheckbox.checked;
  buildTabHeader('searches');
  applySearchesFilters();
});

searchesSearchInput.addEventListener('input', () => applySearchesFilters());

function applySearchesFilters() {
  let results = [...tabState.searches.data];

  if (suspiciousFilterActive) {
    results = results.filter(row => row.flagged);
  }

  const term = searchesSearchInput.value.trim().toLowerCase();

  if (term) {
    results = results.filter(r => r.searchTerm && r.searchTerm.toLowerCase().includes(term));
  }

  if (searchesDedupActive) {
    results = deduplicateSearches(results);
  }

  tabState.searches.displayed = results;
  tabState.searches.page = 0;
  renderTabPage('searches');
}

function deduplicateSearches(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = (row.searchTerm || '').toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const deduped = [];
  for (const [, group] of groups) {
    let earliest = group[0], latest = group[0];
    for (const r of group) {
      const t = new Date(r.visitTime).getTime();
      if (t < new Date(earliest.visitTime).getTime()) earliest = r;
      if (t > new Date(latest.visitTime).getTime()) latest = r;
    }
    deduped.push({
      ...earliest,
      visitTime: earliest.visitTime,
      lastVisitTime: latest.visitTime,
      hits: group.length,
    });
  }
  return deduped;
}

bookmarksSearchInput.addEventListener('input', () => {
  const term = bookmarksSearchInput.value.trim().toLowerCase();
  if (term) {
    tabState.bookmarks.displayed = tabState.bookmarks.data.filter(r =>
      r.name && r.name.toLowerCase().includes(term)
    );
  } else {
    tabState.bookmarks.displayed = [...tabState.bookmarks.data];
  }
  tabState.bookmarks.page = 0;
  renderTabPage('bookmarks');
});

function applyUrlFilters() {
  let results = [...tabState.urls.data];

  if (suspiciousFilterActive) {
    results = results.filter(row => row.flagged);
  }

  if (searchTerm) {
    results = results.filter(row =>
      (row.url && row.url.toLowerCase().includes(searchTerm)) ||
      (row.title && row.title.toLowerCase().includes(searchTerm))
    );
  }

  if (dedupFilterActive) {
    results = deduplicateResults(results);
  }

  tabState.urls.displayed = results;
  tabState.urls.page = 0;
  renderTabPage('urls');
}

function deduplicateResults(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.url)) groups.set(row.url, []);
    groups.get(row.url).push(row);
  }

  const deduped = [];
  for (const [, group] of groups) {
    if (group.length === 1) {
      deduped.push({ ...group[0], lastVisitTime: group[0].visitTime });
    } else {
      let earliest = group[0], latest = group[0];
      for (const r of group) {
        const t = new Date(r.visitTime).getTime();
        if (t < new Date(earliest.visitTime).getTime()) earliest = r;
        if (t > new Date(latest.visitTime).getTime()) latest = r;
      }
      const totalMicro = group.reduce((sum, r) => sum + (r.visitDurationMicro || 0), 0);
      deduped.push({
        ...earliest,
        lastVisitTime: latest.visitTime,
        visitDuration: formatDurationFromMicro(totalMicro),
        visitDurationMicro: totalMicro,
        visitCount: Math.max(...group.map(r => r.visitCount || 0)),
        flagged: group.some(r => r.flagged),
      });
    }
  }
  return deduped;
}

function formatDurationFromMicro(microseconds) {
  if (!microseconds || microseconds === 0) return '';
  const totalSeconds = Math.floor(microseconds / 1000000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ── Browsers ──

const SUPPORTED_BROWSERS = ['Brave', 'Chrome', 'Chromium', 'Edge', 'Firefox', 'Opera'];

async function loadProfiles() {
  profiles = await window.api.getProfiles();
  buildBrowserChips();
}

function buildBrowserChips() {
  profilesContainer.innerHTML = '';
  profilesContainer.appendChild(createBrowserChip('Select All', null, true));
  SUPPORTED_BROWSERS.forEach((name) => {
    profilesContainer.appendChild(createBrowserChip(name, name, false));
  });
  selectAllBrowsers(true);
}

function createBrowserChip(label, browserName, isSelectAll) {
  const chip = document.createElement('div');
  chip.className = 'profile-chip' + (isSelectAll ? ' select-all-chip' : '');
  chip.dataset.browser = browserName || '';
  chip.dataset.selectAll = isSelectAll;
  chip.innerHTML = `<span class="profile-chip-dot"></span><span class="profile-chip-label">${label}</span>`;
  chip.addEventListener('click', () => {
    if (isSelectAll) {
      selectAllBrowsers(!chip.classList.contains('selected'));
    } else {
      chip.classList.toggle('selected');
      updateSelectAllState();
    }
  });
  return chip;
}

function selectAllBrowsers(select) {
  profilesContainer.querySelectorAll('.profile-chip').forEach(chip => chip.classList.toggle('selected', select));
}

function updateSelectAllState() {
  const allChip = profilesContainer.querySelector('[data-select-all="true"]');
  if (!allChip) return;
  const chips = profilesContainer.querySelectorAll('.profile-chip:not([data-select-all="true"])');
  allChip.classList.toggle('selected', [...chips].every(c => c.classList.contains('selected')));
}

function getSelectedBrowserNames() {
  const names = [];
  profilesContainer.querySelectorAll('.profile-chip:not([data-select-all="true"]).selected').forEach(chip => {
    names.push(chip.dataset.browser);
  });
  return names;
}

function getSelectedProfiles() {
  const selectedNames = getSelectedBrowserNames();
  return profiles.filter(p => selectedNames.includes(p.browser));
}

// ── Source Modal ──

const sourceModal = document.getElementById('sourceModal');
const sourceModalClose = document.getElementById('sourceModalClose');
const sourceModalCancel = document.getElementById('sourceModalCancel');
const sourceModalConfirm = document.getElementById('sourceModalConfirm');
const uploadConfig = document.getElementById('uploadConfig');
const uploadSlots = document.getElementById('uploadSlots');
let uploadSlotData = [];

function showSourceModal() {
  uploadSlotData = [];
  uploadSlots.innerHTML = '';
  uploadConfig.style.display = 'none';
  document.querySelectorAll('.source-option').forEach(o => o.classList.remove('selected'));
  const localOpt = document.querySelector('.source-option[data-source="local"]');
  localOpt.classList.add('selected');
  localOpt.querySelector('input').checked = true;
  sourceModal.style.display = 'flex';
}

function hideSourceModal() {
  sourceModal.style.display = 'none';
}

sourceModalClose.addEventListener('click', hideSourceModal);
sourceModalCancel.addEventListener('click', hideSourceModal);
sourceModal.addEventListener('click', (e) => {
  if (e.target === sourceModal) hideSourceModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && sourceModal.style.display !== 'none') hideSourceModal();
});

document.querySelectorAll('.source-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.source-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    opt.querySelector('input[type="radio"]').checked = true;
    const isUpload = opt.dataset.source === 'upload';
    uploadConfig.style.display = isUpload ? '' : 'none';
    if (isUpload) buildUploadSlots();
  });
});

function buildUploadSlots() {
  const browserNames = getSelectedBrowserNames();
  uploadSlotData = browserNames.map(name => ({
    browser: name,
    engine: name === 'Firefox' ? 'firefox' : 'chromium',
    profileName: 'Uploaded',
    historyFile: null,
    bookmarksFile: null,
  }));

  uploadSlots.innerHTML = '';
  uploadSlotData.forEach((slot, i) => {
    const isFF = slot.engine === 'firefox';
    const histLabel = isFF ? 'places.sqlite' : 'History File';
    const row = document.createElement('div');
    row.className = 'upload-slot';
    row.innerHTML = `
      <div class="upload-slot-label">${esc(slot.browser)}</div>
      <div class="upload-slot-pickers">
        <button class="upload-pick-btn" data-slot="${i}" data-type="history">
          <span class="upload-pick-icon">&#128196;</span>
          <span class="upload-pick-text">${histLabel}</span>
        </button>
        ${isFF ? '' : `<button class="upload-pick-btn" data-slot="${i}" data-type="bookmarks">
          <span class="upload-pick-icon">&#9733;</span>
          <span class="upload-pick-text">Bookmarks File</span>
        </button>`}
      </div>
      ${isFF ? '<div class="upload-slot-hint">Firefox stores history, searches, and bookmarks in one file</div>' : ''}
    `;
    uploadSlots.appendChild(row);
  });

  uploadSlots.querySelectorAll('.upload-pick-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const idx = parseInt(btn.dataset.slot);
      const type = btn.dataset.type;
      const filePath = await window.api.openSingleFileDialog();
      if (!filePath) return;
      const fileName = filePath.split('/').pop();
      if (type === 'history') {
        uploadSlotData[idx].historyFile = filePath;
      } else {
        uploadSlotData[idx].bookmarksFile = filePath;
      }
      btn.classList.add('has-file');
      btn.querySelector('.upload-pick-text').textContent = fileName;
    });
  });
}

sourceModalConfirm.addEventListener('click', () => {
  const source = document.querySelector('input[name="loadSource"]:checked').value;
  if (source === 'upload') {
    const filled = uploadSlotData.filter(s => s.historyFile || s.bookmarksFile);
    if (filled.length === 0) {
      showToast('Select at least one file', 'error');
      return;
    }
    hideSourceModal();
    performUploadLoad();
  } else {
    hideSourceModal();
    performLoad();
  }
});

// ── Reset & Populate ──

function resetAndPopulate(historyData, searchData, bookmarkData) {
  suspiciousCheckbox.checked = false;
  suspiciousFilterActive = false;
  dedupCheckbox.checked = false;
  dedupFilterActive = false;
  searchInput.value = '';
  searchTerm = '';
  searchesDedupCheckbox.checked = false;
  searchesDedupActive = false;
  searchesSearchInput.value = '';
  bookmarksSearchInput.value = '';
  suspiciousToggle.classList.add('disabled');

  tabState.urls.data = historyData;
  tabState.urls.displayed = [...historyData];
  tabState.urls.page = 0;
  tabState.urls.sortCol = null;

  tabState.searches.data = searchData;
  tabState.searches.displayed = [...searchData];
  tabState.searches.page = 0;
  tabState.searches.sortCol = null;

  tabState.bookmarks.data = bookmarkData;
  tabState.bookmarks.displayed = [...bookmarkData];
  tabState.bookmarks.page = 0;
  tabState.bookmarks.sortCol = null;

  buildTabHeader('urls');
  buildTabHeader('searches');
  buildTabHeader('bookmarks');

  resultsPanel.style.display = 'flex';
  switchTab('urls');
}

// ── Load All Data ──

loadBtn.addEventListener('click', () => {
  if (getSelectedBrowserNames().length === 0) {
    showToast('Select at least one browser', 'error');
    return;
  }
  showSourceModal();
});

async function performLoad() {
  const selectedProfiles = getSelectedProfiles();
  const startDate = allTimeCheckbox.checked ? null : startDateInput.value || null;
  const endDate = endDateInput.value || formatInputDate(new Date());
  const loadOpts = { profiles: selectedProfiles, startDate, endDate };

  loadBtn.disabled = true;
  loadingOverlay.style.display = 'flex';
  statusText.textContent = 'Loading...';

  try {
    const [historyResults, bookmarkResults] = await Promise.all([
      window.api.loadHistory(loadOpts),
      window.api.loadBookmarks(selectedProfiles),
    ]);

    const searchResults = await window.api.loadSearches({
      ...loadOpts,
      historyRows: historyResults,
    });

    resetAndPopulate(historyResults, searchResults, bookmarkResults);

    const counts = [
      `${historyResults.length.toLocaleString()} URLs`,
      `${searchResults.length.toLocaleString()} searches`,
      `${bookmarkResults.length.toLocaleString()} bookmarks`,
    ];
    statusText.textContent = counts.join(' | ');

    runProfanityAnalysis();
  } catch (err) {
    showToast('Failed to load: ' + err.message, 'error');
    statusText.textContent = 'Error';
  } finally {
    loadBtn.disabled = false;
    loadingOverlay.style.display = 'none';
  }
}

async function performUploadLoad() {
  const startDate = allTimeCheckbox.checked ? null : startDateInput.value || null;
  const endDate = endDateInput.value || formatInputDate(new Date());
  const slots = uploadSlotData.filter(s => s.historyFile || s.bookmarksFile);

  loadBtn.disabled = true;
  loadingOverlay.style.display = 'flex';
  statusText.textContent = 'Loading uploaded files...';

  try {
    const result = await window.api.loadUploaded({ slots, startDate, endDate });

    resetAndPopulate(result.history, result.searches, result.bookmarks);

    const counts = [
      `${result.history.length.toLocaleString()} URLs`,
      `${result.searches.length.toLocaleString()} searches`,
      `${result.bookmarks.length.toLocaleString()} bookmarks`,
    ];
    statusText.textContent = counts.join(' | ') + ' (uploaded)';

    if (result.history.length > 0) runProfanityAnalysis();
  } catch (err) {
    showToast('Failed to load uploaded files: ' + err.message, 'error');
    statusText.textContent = 'Error';
  } finally {
    loadBtn.disabled = false;
    loadingOverlay.style.display = 'none';
  }
}

// ── Profanity Analysis (background) ──

async function runProfanityAnalysis() {
  analysisBar.style.display = 'flex';
  analysisBar.classList.remove('complete');
  analysisLabel.textContent = 'Running keyword analysis + AI toxicity model...';
  analysisProgressFill.style.width = '10%';

  try {
    const [flagged, flaggedSearches] = await Promise.all([
      window.api.flagRows(tabState.urls.data),
      window.api.flagSearches(tabState.searches.data),
    ]);
    analysisProgressFill.style.width = '90%';

    for (let i = 0; i < tabState.urls.data.length; i++) {
      tabState.urls.data[i].flagged = flagged[i].flagged;
    }
    for (let i = 0; i < tabState.searches.data.length; i++) {
      tabState.searches.data[i].flagged = flaggedSearches[i].flagged;
    }

    if (suspiciousFilterActive) {
      applyUrlFilters();
      applySearchesFilters();
    }
    renderTabPage('urls');
    renderTabPage('searches');

    analysisProgressFill.style.width = '100%';
    const flagCount = tabState.urls.data.filter(r => r.flagged).length + tabState.searches.data.filter(r => r.flagged).length;
    analysisLabel.textContent = `Analysis complete \u2014 ${flagCount} suspicious record${flagCount !== 1 ? 's' : ''} found`;
    analysisBar.classList.add('complete');
    suspiciousToggle.classList.remove('disabled');
  } catch (err) {
    analysisLabel.textContent = 'Analysis failed: ' + err.message;
    analysisProgressFill.style.width = '100%';
  }

  setTimeout(() => { analysisBar.style.display = 'none'; }, 5000);
}

// ── Generic Table Header ──

function buildTabHeader(tabName) {
  const state = tabState[tabName];
  const columns = state.getColumns();
  const tr = document.createElement('tr');
  columns.forEach(col => {
    const th = document.createElement('th');
    th.dataset.key = col.key;
    th.innerHTML = `${esc(col.label)}<span class="sort-arrow"></span>`;
    th.addEventListener('click', () => handleTabSort(tabName, col.key));
    tr.appendChild(th);
  });
  state.headEl.innerHTML = '';
  state.headEl.appendChild(tr);
}

// ── Generic Sort ──

function handleTabSort(tabName, key) {
  const state = tabState[tabName];
  const columns = state.getColumns();

  if (state.sortCol === key) {
    state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    state.sortCol = key;
    state.sortDir = 'asc';
  }

  const col = columns.find(c => c.key === key);
  if (!col) return;

  state.displayed.sort((a, b) => {
    let va = a[key], vb = b[key];
    if (col.type === 'number') {
      return state.sortDir === 'asc' ? (Number(va)||0) - (Number(vb)||0) : (Number(vb)||0) - (Number(va)||0);
    }
    if (col.type === 'date') {
      const da = va ? new Date(va).getTime() : 0;
      const db = vb ? new Date(vb).getTime() : 0;
      return state.sortDir === 'asc' ? da - db : db - da;
    }
    if (col.type === 'duration') {
      return state.sortDir === 'asc' ? durSec(va) - durSec(vb) : durSec(vb) - durSec(va);
    }
    va = String(va || '').toLowerCase();
    vb = String(vb || '').toLowerCase();
    if (va < vb) return state.sortDir === 'asc' ? -1 : 1;
    if (va > vb) return state.sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  state.page = 0;
  renderTabPage(tabName);
}

function durSec(val) {
  if (!val) return 0;
  const p = String(val).split(':');
  return p.length === 3 ? parseInt(p[0]) * 3600 + parseInt(p[1]) * 60 + parseInt(p[2]) : 0;
}

// ── Generic Page Rendering ──

function renderTabPage(tabName) {
  const state = tabState[tabName];
  if (tabName !== activeTab) return;

  const columns = state.getColumns();
  const total = state.displayed.length;
  const start = state.page * PAGE_SIZE;
  const end = Math.min(start + PAGE_SIZE, total);
  const pageRows = state.displayed.slice(start, end);

  const fragment = document.createDocumentFragment();
  for (const row of pageRows) {
    const tr = document.createElement('tr');
    if (row.flagged) tr.classList.add('flagged');
    tr.innerHTML = columns.map(col => td(col.key, row[col.key])).join('');
    fragment.appendChild(tr);
  }
  state.bodyEl.innerHTML = '';
  state.bodyEl.appendChild(fragment);

  updateSortStyles(tabName);
  updatePager(tabName);
}

function updateSortStyles(tabName) {
  const state = tabState[tabName];
  state.headEl.querySelectorAll('th').forEach(th => {
    const arrow = th.querySelector('.sort-arrow');
    if (th.dataset.key === state.sortCol) {
      th.classList.add('sort-active');
      arrow.textContent = state.sortDir === 'asc' ? ' \u25B2' : ' \u25BC';
    } else {
      th.classList.remove('sort-active');
      arrow.textContent = '';
    }
  });
}

function updatePager(tabName) {
  const state = tabState[tabName];
  const total = state.displayed.length;
  const startNum = total > 0 ? state.page * PAGE_SIZE + 1 : 0;
  const endNum = Math.min((state.page + 1) * PAGE_SIZE, total);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  recordCount.innerHTML = `Showing <strong>${startNum}-${endNum}</strong> of <strong>${total.toLocaleString()}</strong>`;

  let pager = document.getElementById('pager');
  if (!pager) {
    pager = document.createElement('div');
    pager.id = 'pager';
    pager.className = 'pager';
    recordCount.parentElement.insertBefore(pager, exportBtn);
  }
  pager.innerHTML = `
    <button class="pager-btn" id="pageFirst" ${state.page === 0 ? 'disabled' : ''}>&laquo;</button>
    <button class="pager-btn" id="pagePrev" ${state.page === 0 ? 'disabled' : ''}>&lsaquo;</button>
    <span class="pager-info">Page ${state.page + 1} / ${pages}</span>
    <button class="pager-btn" id="pageNext" ${state.page >= pages - 1 ? 'disabled' : ''}>&rsaquo;</button>
    <button class="pager-btn" id="pageLast" ${state.page >= pages - 1 ? 'disabled' : ''}>&raquo;</button>
  `;
  document.getElementById('pageFirst').onclick = () => { state.page = 0; renderTabPage(tabName); };
  document.getElementById('pagePrev').onclick = () => { state.page = Math.max(0, state.page - 1); renderTabPage(tabName); };
  document.getElementById('pageNext').onclick = () => { state.page = Math.min(pages - 1, state.page + 1); renderTabPage(tabName); };
  document.getElementById('pageLast').onclick = () => { state.page = pages - 1; renderTabPage(tabName); };
}

// ── Helpers ──

function td(key, value) {
  const escaped = esc(String(value ?? ''));
  return `<td data-key="${key}" title="${escaped}">${escaped}</td>`;
}

function esc(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Export ──

exportBtn.addEventListener('click', async () => {
  const state = tabState[activeTab];
  const data = activeTab === 'urls' ? state.data : state.displayed;
  if (!data || data.length === 0) {
    showToast('No data to export', 'error');
    return;
  }

  const columns = state.getColumns();
  const headers = columns.map(c => c.label);
  const fieldKeys = columns.map(c => c.key);

  try {
    const result = await window.api.exportCsv({ rows: data, headers, fieldKeys });
    if (result.success) {
      showToast(`Exported ${result.count.toLocaleString()} records to CSV`, 'success');
    }
  } catch (err) {
    showToast('Export failed: ' + err.message, 'error');
  }
});

// ── Toast ──

function showToast(message, type) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}
