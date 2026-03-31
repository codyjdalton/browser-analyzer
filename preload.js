const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getProfiles: () => ipcRenderer.invoke('get-profiles'),
  loadHistory: (options) => ipcRenderer.invoke('load-history', options),
  loadSearches: (options) => ipcRenderer.invoke('load-searches', options),
  loadBookmarks: (profiles) => ipcRenderer.invoke('load-bookmarks', profiles),
  openSingleFileDialog: () => ipcRenderer.invoke('open-single-file-dialog'),
  loadUploaded: (options) => ipcRenderer.invoke('load-uploaded', options),
  flagRows: (rows) => ipcRenderer.invoke('flag-rows', rows),
  flagSearches: (rows) => ipcRenderer.invoke('flag-searches', rows),
  exportCsv: (data) => ipcRenderer.invoke('export-csv', data),
});
