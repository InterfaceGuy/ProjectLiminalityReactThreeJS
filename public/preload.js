const { contextBridge, ipcRenderer } = require('electron');

console.log('Preload script is running');

const electronAPI = {
  fileSystem: {
    getMediaFilePath: (repoName) => ipcRenderer.invoke('get-media-file-path', repoName),
    getFileStats: (filePath) => ipcRenderer.invoke('get-file-stats', filePath),
    readMetadata: (repoName) => ipcRenderer.invoke('read-metadata', repoName),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  },
  getDreamVaultPath: () => ipcRenderer.invoke('get-dream-vault-path'),
  setDreamVaultPath: (path) => ipcRenderer.invoke('set-dream-vault-path', path),
  scanDreamVault: () => ipcRenderer.invoke('scan-dream-vault'),
  openDirectoryDialog: () => ipcRenderer.invoke('open-directory-dialog'),
  isElectron: true
};

contextBridge.exposeInMainWorld('electron', electronAPI);

console.log('Electron API exposed to renderer:', electronAPI);

window.addEventListener('DOMContentLoaded', () => {
  console.log('DOMContentLoaded event fired');
  console.log('window.electron:', window.electron);
});
