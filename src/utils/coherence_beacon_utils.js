const fs = require('fs').promises;
const path = require('path');
const Store = require('electron-store');
const store = new Store();

async function readDreamSongCanvas(repoName) {
  const dreamVaultPath = store.get('dreamVaultPath');
  if (!dreamVaultPath) {
    throw new Error('Dream Vault path is not set in the application settings');
  }
  const canvasPath = path.join(dreamVaultPath, repoName, 'DreamSong.canvas');
  try {
    const data = await fs.readFile(canvasPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading DreamSong.canvas for ${repoName}:`, error);
    return null;
  }
}

async function parseGitModules(repoName) {
  const dreamVaultPath = store.get('dreamVaultPath');
  if (!dreamVaultPath) {
    throw new Error('Dream Vault path is not set in the application settings');
  }
  const gitmodulesPath = path.join(dreamVaultPath, repoName, '.gitmodules');
  try {
    const data = await fs.readFile(gitmodulesPath, 'utf8');
    // Simple parsing of .gitmodules file
    const submodules = data.match(/path = .+/g);
    return submodules ? submodules.map(line => line.split(' = ')[1].trim()) : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      // .gitmodules file doesn't exist, which is fine
      return [];
    }
    throw error;
  }
}

async function getDreamSongDependencies(repoName) {
  const dreamVaultPath = store.get('dreamVaultPath');
  if (!dreamVaultPath) {
    throw new Error('Dream Vault path is not set in the application settings');
  }
  const canvasData = await readDreamSongCanvas(repoName);
  if (!canvasData || !canvasData.nodes) {
    return [];
  }

  const fileNodes = canvasData.nodes.filter(node => node.type === 'file' && node.file);
  const externalDependencies = fileNodes
    .map(node => node.file)
    .filter(filePath => !filePath.startsWith(repoName + '/'))
    .map(filePath => filePath.split('/')[0]);

  return [...new Set(externalDependencies)]; // Remove duplicates
}

function computePositiveDelta(currentSubmodules, dreamSongDependencies) {
  return dreamSongDependencies.filter(dep => !currentSubmodules.includes(dep));
}

async function identifyFriendsToNotify(newSubmodules, friendsList) {
  // TODO: Implement logic to identify friends who should be notified
  // This will require additional backend functionality to check which friends have which repositories
  return [];
}

module.exports = {
  parseGitModules,
  getDreamSongDependencies,
  computePositiveDelta,
  identifyFriendsToNotify
};