import React, { useState, useEffect } from 'react';
import { BLACK, WHITE } from '../constants/colors';
import { readDreamSongCanvas } from '../utils/fileUtils';
import { processDreamSongData } from '../utils/dreamSongUtils';

const DreamSong = ({ repoName, dreamSongMedia, onClick, onRightClick }) => {
  const [processedNodes, setProcessedNodes] = useState([]);

  useEffect(() => {
    const fetchAndProcessCanvas = async () => {
      const canvasData = await readDreamSongCanvas(repoName);
      if (canvasData) {
        const processed = processDreamSongData(canvasData);
        setProcessedNodes(processed);
      }
    };

    fetchAndProcessCanvas();
  }, [repoName]);

  const handleMediaClick = (event, mediaFile) => {
    console.log('Clicked on media:', mediaFile);
  };

  const renderMediaElement = (file, index) => {
    const mediaItem = dreamSongMedia.find(item => item.filePath === file);
    if (!mediaItem) return null;

    const isVideo = /\.(mp4|webm|ogg)$/i.test(file);
    if (isVideo) {
      return (
        <video
          key={`video-${index}`}
          src={`data:${mediaItem.mimeType};base64,${mediaItem.data}`}
          style={{ maxWidth: '100%', height: 'auto' }}
          controls
          onClick={(event) => handleMediaClick(event, file)}
        />
      );
    } else {
      return (
        <img
          key={`img-${index}`}
          src={`data:${mediaItem.mimeType};base64,${mediaItem.data}`}
          alt={file}
          style={{ maxWidth: '100%', height: 'auto' }}
          onClick={(event) => handleMediaClick(event, file)}
        />
      );
    }
  };

  const renderNode = (node, index) => {
    if (node.type === 'file') {
      return renderMediaElement(node.file, `file-${index}`);
    } else if (node.type === 'text') {
      return <div key={`text-${index}`} dangerouslySetInnerHTML={{ __html: node.text }} />;
    }
    return null;
  };

  return (
    <div 
      className="dream-song" 
      style={{ 
        backgroundColor: BLACK, 
        color: WHITE, 
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px'
      }}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        onRightClick(e);
      }}
    >
      <h2>{repoName}</h2>
      <div style={{ width: '100%', maxWidth: '800px' }}>
        {processedNodes.length > 0 ? (
          processedNodes.map((node, index) => renderNode(node, index))
        ) : (
          <p>No DreamSong data available</p>
        )}
      </div>
    </div>
  );
};

export default React.memo(DreamSong);
