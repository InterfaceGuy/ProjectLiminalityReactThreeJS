const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  fileSystem: {
    getMediaFilePath: (repoName, fileName) => ipcRenderer.invoke('get-media-file-path', repoName, fileName),
    getDreamSongMediaFilePath: (repoName, fileName) => ipcRenderer.invoke('get-dreamsong-media-file-path', repoName, fileName),
    getFileStats: (filePath) => ipcRenderer.invoke('get-file-stats', filePath),
    readMetadata: (repoName) => ipcRenderer.invoke('read-metadata', repoName),
    writeMetadata: (repoName, metadata) => ipcRenderer.invoke('write-metadata', repoName, metadata),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    readDreamSongCanvas: (repoName) => ipcRenderer.invoke('read-dreamsong-canvas', repoName),
    listFiles: (repoName) => ipcRenderer.invoke('list-files', repoName),
    renameRepo: (oldName, newName) => ipcRenderer.invoke('rename-repo', oldName, newName),
    createNewNode: (nodeName) => ipcRenderer.invoke('create-new-node', nodeName),
    addFileToNode: (nodeName, file) => ipcRenderer.invoke('add-file-to-node', nodeName, file),
    processFile: (repoName, file, processorRepo) => {
      console.log(`Invoking process-file from preload.js for repo: ${repoName}, file: ${file}, processor: ${processorRepo}`);
      return ipcRenderer.invoke('process-file', repoName, file, processorRepo);
    },
    stageFile: (nodeName, fileName) => ipcRenderer.invoke('stage-file', nodeName, fileName),
    commitChanges: (nodeName, commitMessage) => ipcRenderer.invoke('commit-changes', nodeName, commitMessage),
    getAllRepoNamesAndTypes: () => ipcRenderer.invoke('get-all-repo-names-and-types'),
    addSubmodule: (parentRepoName, submoduleRepoName) => ipcRenderer.invoke('add-submodule', parentRepoName, submoduleRepoName),
    updateSubmodules: (repoName) => ipcRenderer.invoke('update-submodules', repoName),
    copyRepositoryToDreamVault: (sourcePath, repoName) => ipcRenderer.invoke('copy-repository-to-dreamvault', sourcePath, repoName),
    unbundleRepositoryToDreamVault: (bundlePath, repoName) => ipcRenderer.invoke('unbundle-repository-to-dreamvault', bundlePath, repoName),
    handleZipArchive: (zipPath) => ipcRenderer.invoke('handle-zip-archive', zipPath),
    getPersonNodes: () => ipcRenderer.invoke('get-person-nodes'),
    createEmailDraft: (repoName, personName) => ipcRenderer.invoke('create-email-draft', repoName, personName),
    triggerCoherenceBeacon: (repoName) => ipcRenderer.invoke('trigger-coherence-beacon', repoName),
    openFile: (repoName, fileName) => ipcRenderer.invoke('open-file', repoName, fileName),
    runAider: (repoName) => ipcRenderer.invoke('run-aider', repoName),
    openCanvas: (repoName) => ipcRenderer.invoke('open-canvas', repoName),
    getDirectoryStructure: (repoName) => ipcRenderer.invoke('get-directory-structure', repoName),
  },
  getDreamVaultPath: () => ipcRenderer.invoke('get-dream-vault-path'),
  setDreamVaultPath: (path) => ipcRenderer.invoke('set-dream-vault-path', path),
  scanDreamVault: () => ipcRenderer.invoke('scan-dream-vault'),
  openDirectoryDialog: () => ipcRenderer.invoke('open-directory-dialog'),
  isElectron: true,
  openInFinder: (repoName) => ipcRenderer.invoke('open-in-finder', repoName),
  openInGitFox: (repoName) => ipcRenderer.invoke('open-in-gitfox', repoName),
});

