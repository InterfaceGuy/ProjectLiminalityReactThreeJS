const { dialog, shell } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { metadataTemplate, getDefaultValue } = require('../src/utils/metadataTemplate.js');

function setupHandlers(ipcMain, store) {

  ipcMain.handle('read-file', async (event, filePath) => {
    console.log('Attempting to read file:', filePath);
    if (!filePath) {
      console.error('Error: filePath is null or undefined');
      return null;
    }
    try {
      const data = await fs.readFile(filePath);
      console.log('File read successfully:', filePath);
      return data.toString('base64');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('File does not exist:', filePath);
        return null;
      }
      console.error('Error reading file:', filePath, error);
      return null;
    }
  });

  ipcMain.handle('open-in-finder', async (event, repoName) => {
    const dreamVaultPath = store.get('dreamVaultPath', '');
    if (!dreamVaultPath) {
      throw new Error('Dream Vault path not set');
    }
    const repoPath = path.join(dreamVaultPath, repoName);
    await shell.openPath(repoPath);
  });

  ipcMain.handle('open-in-gitfox', async (event, repoName) => {
    const dreamVaultPath = store.get('dreamVaultPath', '');
    if (!dreamVaultPath) {
      throw new Error('Dream Vault path not set');
    }
    const repoPath = path.join(dreamVaultPath, repoName);
    return new Promise((resolve, reject) => {
      exec(`cd "${dreamVaultPath}" && gitfox "${repoName}"`, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error opening GitFox: ${error}`);
          reject(error);
        } else {
          console.log(`GitFox opened for ${repoName}`);
          resolve();
        }
      });
    });
  });
  ipcMain.handle('open-directory-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    return result.filePaths[0];
  });

  ipcMain.handle('get-dream-vault-path', () => {
    return store.get('dreamVaultPath', '');
  });

  ipcMain.handle('set-dream-vault-path', (event, path) => {
    store.set('dreamVaultPath', path);
  });

  ipcMain.handle('scan-dream-vault', async () => {
    const dreamVaultPath = store.get('dreamVaultPath', '');
    if (!dreamVaultPath) {
      return [];
    }

    try {
      const entries = await fs.readdir(dreamVaultPath, { withFileTypes: true });
      const gitRepos = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const repoPath = path.join(dreamVaultPath, entry.name);
          const gitDir = path.join(repoPath, '.git');
          try {
            await fs.access(gitDir);
            gitRepos.push(entry.name);
          } catch (error) {
            // Not a git repository, skip
          }
        }
      }

      return gitRepos;
    } catch (error) {
      console.error('Error scanning DreamVault:', error);
      return [];
    }
  });

  ipcMain.handle('read-metadata', async (event, repoName) => {
    const dreamVaultPath = store.get('dreamVaultPath', '');
    if (!dreamVaultPath) {
      throw new Error('Dream Vault path not set');
    }

    const metadataPath = path.join(dreamVaultPath, repoName, '.pl');
    try {
      const data = await fs.readFile(metadataPath, 'utf8');
      let metadata = JSON.parse(data);

      // Ensure all template fields are present
      for (const [key, defaultValue] of Object.entries(metadataTemplate)) {
        if (!(key in metadata)) {
          metadata[key] = defaultValue;
        }
      }

      // Write back the updated metadata
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

      return metadata;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // If the file doesn't exist, create it with the template
        const newMetadata = { ...metadataTemplate };
        await fs.writeFile(metadataPath, JSON.stringify(newMetadata, null, 2), 'utf8');
        return newMetadata;
      }
      console.error(`Error reading metadata for ${repoName}:`, error);
      throw error;
    }
  });

  ipcMain.handle('write-metadata', async (event, repoName, metadata) => {
    const dreamVaultPath = store.get('dreamVaultPath', '');
    if (!dreamVaultPath) {
      throw new Error('Dream Vault path not set');
    }

    const metadataPath = path.join(dreamVaultPath, repoName, '.pl');
    try {
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error(`Error writing metadata for ${repoName}:`, error);
      throw error;
    }
  });

  ipcMain.handle('get-media-file-path', async (event, repoName) => {
    const dreamVaultPath = store.get('dreamVaultPath');
    const repoPath = path.join(dreamVaultPath, repoName);
    const supportedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp3', '.wav', '.ogg'];
    
    try {
      for (const ext of supportedExtensions) {
        const filePath = path.join(repoPath, `${repoName}${ext}`);
        try {
          await fs.access(filePath);
          return filePath;
        } catch (error) {
          // File doesn't exist, continue to next extension
        }
      }
      
      console.log(`No matching media file found for ${repoName}`);
      return null;
    } catch (error) {
      console.error(`Error searching for media file for ${repoName}:`, error);
      return null;
    }
  });

  ipcMain.handle('get-file-stats', async (event, filePath) => {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        mtime: stats.mtime
      };
    } catch (error) {
      console.error(`Error getting file stats for ${filePath}:`, error);
      return null;
    }
  });

  ipcMain.handle('list-files', async (event, repoName) => {
    const dreamVaultPath = store.get('dreamVaultPath', '');
    if (!dreamVaultPath) {
      throw new Error('Dream Vault path not set');
    }

    const repoPath = path.join(dreamVaultPath, repoName);
    try {
      const files = await fs.readdir(repoPath);
      return files;
    } catch (error) {
      console.error(`Error listing files for ${repoName}:`, error);
      throw error;
    }
  });

  ipcMain.handle('rename-repo', async (event, oldName, newName) => {
    const dreamVaultPath = store.get('dreamVaultPath', '');
    if (!dreamVaultPath) {
      throw new Error('Dream Vault path not set');
    }

    const oldPath = path.join(dreamVaultPath, oldName);
    const newPath = path.join(dreamVaultPath, newName);

    try {
      await fs.rename(oldPath, newPath);
      console.log(`Successfully renamed repo from ${oldName} to ${newName}`);
      return true;
    } catch (error) {
      console.error(`Error renaming repo from ${oldName} to ${newName}:`, error);
      throw error;
    }
  });

  ipcMain.handle('create-new-node', async (event, nodeName) => {
    if (!nodeName) {
      throw new Error('Node name is required');
    }

    const dreamVaultPath = store.get('dreamVaultPath', '');
    if (!dreamVaultPath) {
      throw new Error('Dream Vault path not set');
    }

    const templatePath = path.join(dreamVaultPath, 'DreamNode');
    const newNodePath = path.join(dreamVaultPath, nodeName);

    try {
      // Check if template exists
      await fs.access(templatePath);

      // Check if a node with the same name already exists
      try {
        await fs.access(newNodePath);
        throw new Error(`A node with the name "${nodeName}" already exists`);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      }

      // Clone the template repository
      const { execSync } = require('child_process');
      execSync(`git clone "${templatePath}" "${newNodePath}"`, { stdio: 'inherit' });

      // Remove the origin remote to disconnect from the template
      execSync('git remote remove origin', { cwd: newNodePath });

      console.log(`Successfully created new node: ${nodeName}`);
      return nodeName;
    } catch (error) {
      console.error('Error creating new node:', error);
      throw error;
    }
  });

  ipcMain.handle('add-file-to-node', async (event, nodeName, fileData) => {
    if (!nodeName || !fileData) {
      throw new Error('Both nodeName and fileData are required');
    }

    const dreamVaultPath = store.get('dreamVaultPath', '');
    if (!dreamVaultPath) {
      throw new Error('Dream Vault path not set');
    }

    const nodePath = path.join(dreamVaultPath, nodeName);
    const filePath = path.join(nodePath, fileData.name);

    try {
      // Check if the node exists
      await fs.access(nodePath);

      // Write the file to the node directory
      await fs.writeFile(filePath, Buffer.from(fileData.data));

      console.log(`Successfully added file ${fileData.name} to node ${nodeName}`);
      return true;
    } catch (error) {
      console.error(`Error adding file to node ${nodeName}:`, error);
      throw error;
    }
  });

  ipcMain.handle('stage-file', async (event, nodeName, fileName) => {
    const dreamVaultPath = store.get('dreamVaultPath', '');
    if (!dreamVaultPath) {
      throw new Error('Dream Vault path not set');
    }

    const nodePath = path.join(dreamVaultPath, nodeName);

    try {
      const { execSync } = require('child_process');
      execSync(`git add "${fileName}"`, { cwd: nodePath });
      console.log(`Successfully staged file ${fileName} in node ${nodeName}`);
      return true;
    } catch (error) {
      console.error(`Error staging file ${fileName} in node ${nodeName}:`, error);
      throw error;
    }
  });

  ipcMain.handle('commit-changes', async (event, nodeName, commitMessage) => {
    const dreamVaultPath = store.get('dreamVaultPath', '');
    if (!dreamVaultPath) {
      throw new Error('Dream Vault path not set');
    }

    const nodePath = path.join(dreamVaultPath, nodeName);

    try {
      const { execSync } = require('child_process');
      execSync(`git commit -m "${commitMessage}"`, { cwd: nodePath });
      console.log(`Successfully committed changes in node ${nodeName}`);
      return true;
    } catch (error) {
      console.error(`Error committing changes in node ${nodeName}:`, error);
      throw error;
    }
  });
}

module.exports = { setupHandlers };
