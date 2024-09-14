import React, { useState, useEffect, useCallback } from 'react';
import DreamSpace from './components/DreamSpace';
import SettingsPanel from './components/SettingsPanel';
import MetadataPanel from './components/MetadataPanel';
import ContextMenu from './components/ContextMenu';
import RenamePanel from './components/RenamePanel';
import NodeCreationPanel from './components/NodeCreationPanel';

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMetadataPanelOpen, setIsMetadataPanelOpen] = useState(false);
  const [isRenamePanelOpen, setIsRenamePanelOpen] = useState(false);
  const [isNodeCreationPanelOpen, setIsNodeCreationPanelOpen] = useState(false);
  const [selectedRepoName, setSelectedRepoName] = useState('');
  const [contextMenu, setContextMenu] = useState(null);

  const handleDragOver = useCallback((event) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback(async (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      console.log('Dropped file name:', file.name);
      try {
        const nodeName = file.name.split('.')[0]; // Use the filename without extension as the node name
        const newNode = await window.electron.fileSystem.createNewNode(nodeName);
        console.log(`New node created: ${newNode}`);
        
        if (newNode) {
          const fileAdded = await window.electron.fileSystem.addFileToNode(newNode, file);
          if (fileAdded) {
            console.log(`File ${file.name} added to node ${newNode}`);
            // You might want to refresh the DreamSpace or update the state here
          } else {
            console.error(`Failed to add file ${file.name} to node ${newNode}`);
          }
        }
      } catch (error) {
        console.error('Error in drag and drop process:', error);
      }
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.metaKey && event.key === ',') {
        setIsSettingsOpen(prev => !prev);
      }
      if (event.metaKey && event.key === 'n') {
        event.preventDefault();
        setIsNodeCreationPanelOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleDragOver, handleDrop]);

  const handleOpenMetadataPanel = (repoName) => {
    console.log(`Opening MetadataPanel: ${repoName}`);
    setSelectedRepoName(repoName);
    setIsMetadataPanelOpen(true);
    setContextMenu(null); // Close context menu when opening metadata panel
  };

  const handleOpenRenamePanel = (repoName) => {
    console.log(`Opening RenamePanel: ${repoName}`);
    setSelectedRepoName(repoName);
    setIsRenamePanelOpen(true);
    setContextMenu(null); // Close context menu when opening rename panel
  };

  const handleNodeRightClick = (repoName, event) => {
    console.log(`Right-clicked on node: ${repoName}`);
    event.preventDefault(); // Prevent default context menu
    setContextMenu({ 
      repoName, 
      position: { x: event.clientX, y: event.clientY } 
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  return (
    <>
      <div className="App" onClick={handleCloseContextMenu}>
        <DreamSpace 
          onNodeRightClick={handleNodeRightClick}
        />
      </div>
      {isSettingsOpen && (
        <SettingsPanel 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      )}
      {isMetadataPanelOpen && (
        <MetadataPanel 
          isOpen={isMetadataPanelOpen}
          onClose={() => setIsMetadataPanelOpen(false)}
          repoName={selectedRepoName}
        />
      )}
      {isRenamePanelOpen && (
        <RenamePanel
          isOpen={isRenamePanelOpen}
          onClose={() => setIsRenamePanelOpen(false)}
          repoName={selectedRepoName}
        />
      )}
      {isNodeCreationPanelOpen && (
        <NodeCreationPanel
          isOpen={isNodeCreationPanelOpen}
          onClose={() => setIsNodeCreationPanelOpen(false)}
        />
      )}
      {contextMenu && (
        <ContextMenu
          repoName={contextMenu.repoName}
          position={contextMenu.position}
          onClose={handleCloseContextMenu}
          onEditMetadata={handleOpenMetadataPanel}
          onRename={handleOpenRenamePanel}
        />
      )}
    </>
  );
}

export default App;
