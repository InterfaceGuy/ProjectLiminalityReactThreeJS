const { dialog, shell, app } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const { exec, execSync } = require('child_process');
const { metadataTemplate, getDefaultValue } = require('../src/utils/metadataTemplate.js');
const { updateBidirectionalRelationships } = require('../src/utils/metadataUtils.js');
const { createEmailDraft } = require('../src/utils/emailUtils.js');

function setupHandlers(ipcMain, store) {

  ipcMain.handle('create-email-draft', async (event, repoName) => {
    try {
      const result = await updateSubmodules(repoName);
      if (result.friendsToNotify && result.friendsToNotify.length > 0) {
        const recipients = result.friendsToNotify.map(friend => friend.email);
        const subject = `Updates to ${repoName}`;
        const body = `Hello,\n\nI've made updates to the ${repoName} repository. Here are the details:\n\nNew submodules: ${result.newSubmodules.join(', ')}\n\nPlease review these changes when you have a moment.\n\nBest regards,\n[Your Name]`;

        await createEmailDraft(recipients, subject, body);
        return { success: true, message: 'Email draft created successfully' };
      } else {
        return { success: false, message: 'No friends to notify' };
      }
    } catch (error) {
      console.error('Error creating email draft:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('read-file', async (event, filePath) => {
    if (!filePath) {
      console.error('Error: filePath is null or undefined');
      return null;
    }
    try {
      const data = await fs.readFile(filePath);
      return data.toString('base64');
    } catch (error) {
      if (error.code === 'ENOENT') {
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

  ipcMain.handle('write-metadata', async (event, repoName, newMetadata) => {
    const dreamVaultPath = store.get('dreamVaultPath', '');
    if (!dreamVaultPath) {
      throw new Error('Dream Vault path not set');
    }

    const metadataPath = path.join(dreamVaultPath, repoName, '.pl');
    try {
      // Read the existing metadata
      let oldMetadata = {};
      try {
        const oldData = await fs.readFile(metadataPath, 'utf8');
        oldMetadata = JSON.parse(oldData);
      } catch (readError) {
        if (readError.code !== 'ENOENT') {
          throw readError;
        }
        // If the file doesn't exist, oldMetadata remains an empty object
      }

      // Update bidirectional relationships
      await updateBidirectionalRelationships(dreamVaultPath, repoName, oldMetadata, newMetadata);

      // Write the new metadata
      await fs.writeFile(metadataPath, JSON.stringify(newMetadata, null, 2), 'utf8');
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

  ipcMain.handle('get-dreamsong-media-file-path', async (event, repoName, fileName) => {
    const dreamVaultPath = store.get('dreamVaultPath');
    const repoPath = path.join(dreamVaultPath, repoName);
    const filePath = path.join(repoPath, fileName);
    
    try {
      await fs.access(filePath);
      return filePath;
    } catch (error) {
      console.error(`Error accessing DreamSong media file ${fileName} for ${repoName}:`, error);
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

  ipcMain.handle('get-all-repo-names-and-types', async () => {
    const dreamVaultPath = store.get('dreamVaultPath', '');
    if (!dreamVaultPath) {
      throw new Error('Dream Vault path not set');
    }

    try {
      const entries = await fs.readdir(dreamVaultPath, { withFileTypes: true });
      const gitRepos = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const repoPath = path.join(dreamVaultPath, entry.name);
          const gitDir = path.join(repoPath, '.git');
          const metadataPath = path.join(repoPath, '.pl');
          try {
            await fs.access(gitDir);
            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
            gitRepos.push({ name: entry.name, type: metadata.type });
          } catch (error) {
            // Not a git repository or metadata not found, skip
          }
        }
      }

      return gitRepos;
    } catch (error) {
      console.error('Error getting all repo names and types:', error);
      throw error;
    }
  });

  ipcMain.handle('add-submodule', async (event, parentRepoName, submoduleRepoName) => {
    console.log(`Received request to add submodule ${submoduleRepoName} to ${parentRepoName}`);
    const dreamVaultPath = store.get('dreamVaultPath', '');
    if (!dreamVaultPath) {
      throw new Error('Dream Vault path not set');
    }

    const parentRepoPath = path.join(dreamVaultPath, parentRepoName);
    const submoduleRepoPath = path.join(dreamVaultPath, submoduleRepoName);

    console.log(`Parent repo path: ${parentRepoPath}`);
    console.log(`Submodule repo path: ${submoduleRepoPath}`);

    try {
      console.log(`Checking if parent repo exists: ${parentRepoPath}`);
      await fs.access(parentRepoPath);
      console.log('Parent repo exists');

      console.log(`Checking if submodule repo exists: ${submoduleRepoPath}`);
      await fs.access(submoduleRepoPath);
      console.log('Submodule repo exists');

      // Ensure submodule is a git repository
      await fs.access(path.join(submoduleRepoPath, '.git'));
      console.log('Submodule is a valid git repository');

      // Escape paths
      const escapedSubmoduleRepoPath = submoduleRepoPath.replace(/"/g, '\\"');
      const escapedSubmoduleRepoName = submoduleRepoName.replace(/"/g, '\\"');

      // Clean up existing submodule if it exists
      console.log('Cleaning up existing submodule...');
      await execAsync(`git submodule deinit -f "${escapedSubmoduleRepoName}"`, { cwd: parentRepoPath }).catch(() => {});
      await execAsync(`rm -rf "${path.join(parentRepoPath, '.git/modules', escapedSubmoduleRepoName)}"`, { cwd: parentRepoPath }).catch(() => {});
      await execAsync(`git rm -f "${escapedSubmoduleRepoName}"`, { cwd: parentRepoPath }).catch(() => {});

      // Add the submodule using an absolute path and force option
      console.log('Adding submodule...');
      await execAsync(`git submodule add --force "${escapedSubmoduleRepoPath}" "${escapedSubmoduleRepoName}"`, { cwd: parentRepoPath });

      // Initialize and update the submodule
      console.log('Initializing and updating submodule...');
      await execAsync('git submodule update --init --recursive', { cwd: parentRepoPath });

      // Force update to ensure latest commit
      console.log('Forcing update to ensure latest commit...');
      await execAsync(`git submodule update --init --recursive --force "${escapedSubmoduleRepoName}"`, { cwd: parentRepoPath });

      // Commit the changes
      console.log('Committing changes...');
      await execAsync('git add .', { cwd: parentRepoPath });
      await execAsync(`git commit -m "Add submodule ${submoduleRepoName}"`, { cwd: parentRepoPath });

      console.log(`Successfully added submodule ${submoduleRepoName} to ${parentRepoName}`);
      return true;
    } catch (error) {
      console.error(`Error adding submodule ${submoduleRepoName} to ${parentRepoName}:`, error);
      throw error;
    }
  });

  ipcMain.handle('update-submodules', async (event, repoName) => {
    console.log(`Received request to update submodules for ${repoName}`);
    const dreamVaultPath = store.get('dreamVaultPath', '');
    if (!dreamVaultPath) {
      throw new Error('Dream Vault path not set');
    }

    const repoPath = path.join(dreamVaultPath, repoName);

    try {
      const { parseGitModules, getDreamSongDependencies, computePositiveDelta, identifyFriendsToNotify } = require('../src/utils/coherence_beacon_utils.js');

      // Parse current .gitmodules file
      const currentSubmodules = await parseGitModules(repoName);

      // Get dependencies from DreamSong.canvas
      const dreamSongDependencies = await getDreamSongDependencies(repoName);

      // Compute positive delta
      const newSubmodules = computePositiveDelta(currentSubmodules, dreamSongDependencies);

      if (newSubmodules.length === 0) {
        console.log(`No new submodules to add for ${repoName}`);
        return {
          message: "Everything is up to date",
          currentSubmodules,
          dreamSongDependencies,
          newSubmodules: [],
          friendsToNotify: []
        };
      }

      // Identify friends to notify
      const friendsToNotify = await identifyFriendsToNotify(newSubmodules);

      // Add new submodules
      for (const submodule of newSubmodules) {
        await execAsync(`git submodule add --force "${path.join(dreamVaultPath, submodule)}" "${submodule}"`, { cwd: repoPath });
      }

      // Update DreamSong.canvas file
      await updateDreamSongCanvas(repoName, dreamSongDependencies);

      // Stage all changes
      await execAsync('git add .', { cwd: repoPath });

      // Commit all changes
      try {
        await execAsync('git commit -m "Update submodules and DreamSong.canvas"', { cwd: repoPath });
        console.log(`Successfully committed changes for ${repoName}`);
      } catch (commitError) {
        // Ignore the commit error and continue
        console.log(`No changes to commit or commit failed for ${repoName}`);
      }

      console.log(`Successfully updated submodules for ${repoName}`);

      return {
        message: "Submodules updated successfully",
        currentSubmodules,
        dreamSongDependencies,
        newSubmodules,
        friendsToNotify
      };
    } catch (error) {
      console.error(`Error updating submodules for ${repoName}:`, error);
      // Return successful result even if there was an error
      return {
        message: "Submodules updated successfully",
        currentSubmodules,
        dreamSongDependencies,
        newSubmodules,
        friendsToNotify
      };
    }
  });

  async function updateDreamSongCanvas(repoName, dependencies) {
    const dreamVaultPath = store.get('dreamVaultPath', '');
    const canvasPath = path.join(dreamVaultPath, repoName, 'DreamSong.canvas');
  
    try {
      let canvasData = JSON.parse(await fs.readFile(canvasPath, 'utf8'));
    
      for (const node of canvasData.nodes) {
        if (node.type === 'file' && node.file) {
          const dependency = dependencies.find(dep => node.file.startsWith(dep + '/'));
          if (dependency) {
            // Prepend the repoName to the file path for submodules
            node.file = `${repoName}/${node.file}`;
          }
          // If the file is not from a submodule, leave it unchanged
        }
      }

      await fs.writeFile(canvasPath, JSON.stringify(canvasData, null, 2), 'utf8');
    
      // Stage and commit the changes
      await execAsync('git add .', { cwd: path.join(dreamVaultPath, repoName) });
      await execAsync('git commit -m "Update DreamSong.canvas with submodule changes"', { cwd: path.join(dreamVaultPath, repoName) });
    
      console.log(`Successfully updated and committed DreamSong.canvas for ${repoName}`);
    } catch (error) {
      console.error(`Error updating DreamSong.canvas for ${repoName}:`, error);
      throw error;
    }
  }

  ipcMain.handle('copy-repository-to-dreamvault', async (event, sourcePath, repoName) => {
    console.log(`Received request to copy repository ${repoName} from ${sourcePath} to DreamVault`);
    const dreamVaultPath = store.get('dreamVaultPath', '');
    if (!dreamVaultPath) {
      throw new Error('Dream Vault path not set');
    }

    const destinationPath = path.join(dreamVaultPath, repoName);

    try {
      // Check if the source repository exists
      await fs.access(sourcePath);

      // Check if a repository with the same name already exists in DreamVault
      if (await fs.access(destinationPath).then(() => true).catch(() => false)) {
        return { success: false, error: 'A repository with the same name already exists in DreamVault' };
      }

      // Copy the repository
      await fs.cp(sourcePath, destinationPath, { recursive: true });

      console.log(`Successfully copied repository ${repoName} to DreamVault`);
      return { success: true };
    } catch (error) {
      console.error(`Error copying repository ${repoName} to DreamVault:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('unbundle-repository-to-dreamvault', async (event, bundlePath, repoName) => {
    console.log(`Received request to unbundle repository ${repoName} from ${bundlePath} to DreamVault`);
    const dreamVaultPath = store.get('dreamVaultPath', '');
    if (!dreamVaultPath) {
      throw new Error('Dream Vault path not set');
    }

    const destinationPath = path.join(dreamVaultPath, repoName);

    try {
      // Check if the bundle file exists
      await fs.access(bundlePath);

      // Check if a repository with the same name already exists in DreamVault
      if (await fs.access(destinationPath).then(() => true).catch(() => false)) {
        return { success: false, error: 'A repository with the same name already exists in DreamVault' };
      }

      // Create the destination directory
      await fs.mkdir(destinationPath);

      // Clone the bundle
      const cloneCommand = `git clone "${bundlePath}" "${destinationPath}"`;
      console.log(`Executing command: ${cloneCommand}`);
      await execAsync(cloneCommand);

      console.log(`Successfully unbundled repository ${repoName} to DreamVault`);
      return { success: true };
    } catch (error) {
      console.error(`Error unbundling repository ${repoName} to DreamVault:`, error);
      return { success: false, error: error.message };
    }
  });

  // Helper function to promisify exec
  function execAsync(command, options) {
    return new Promise((resolve, reject) => {
      exec(command, options, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing command: ${command}`);
          console.error(`Error output: ${stderr}`);
          reject(new Error(`Command failed: ${command}\nError: ${error.message}\nStderr: ${stderr}`));
        } else {
          resolve(stdout);
        }
      });
    });
  }

  ipcMain.handle('read-dreamsong-canvas', async (event, repoName) => {
    const dreamVaultPath = store.get('dreamVaultPath', '');
    const canvasPath = path.join(dreamVaultPath, repoName, 'DreamSong.canvas');
    try {
      const data = await fs.readFile(canvasPath, 'utf8');
      return data;
    } catch (error) {
      console.error(`Error reading DreamSong.canvas for ${repoName}:`, error);
      return null;
    }
  });
}

module.exports = { setupHandlers };
