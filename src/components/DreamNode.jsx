import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer';
import DreamTalk from './DreamTalk';
import DreamSong from './DreamSong';
import { updatePosition, updateRotation, updateScale } from '../utils/3DUtils';
import { readMetadata, getMediaFilePath } from '../services/electronService';

const DreamNode = ({ sceneState, initialPosition, repoName, onNodeClick }) => {
  const nodeRef = useRef(null);
  const objectRef = useRef(null);
  const [metadata, setMetadata] = useState({});
  const [isFlipped, setIsFlipped] = useState(false);
  const [mediaContent, setMediaContent] = useState(null);

  const fetchMetadata = useCallback(async () => {
    try {
      const data = await readMetadata(repoName);
      setMetadata(data);
      if (data.mediaContent) {
        const mediaPath = await getMediaFilePath(repoName);
        setMediaContent({ ...data.mediaContent, path: mediaPath });
      }
    } catch (error) {
      console.error('Error reading metadata:', error);
      setMetadata({});
    }
  }, [repoName]);

  useEffect(() => {
    fetchMetadata();
  }, [fetchMetadata]);

  useEffect(() => {
    if (sceneState && sceneState.scene && nodeRef.current) {
      const object = new THREE.Object3D();
      const nodeContainer = new THREE.Object3D();
      object.add(nodeContainer);
      object.position.copy(initialPosition);

      sceneState.scene.add(object);

      const dreamTalkObject = new CSS3DObject(nodeRef.current.querySelector('.dream-talk'));
      const dreamSongObject = new CSS3DObject(nodeRef.current.querySelector('.dream-song'));

      nodeContainer.add(dreamTalkObject);
      nodeContainer.add(dreamSongObject);

      dreamTalkObject.position.set(0, 0, 1);
      dreamSongObject.position.set(0, 0, -1);
      dreamSongObject.rotation.y = Math.PI;

      objectRef.current = object;

      return () => {
        sceneState.scene.remove(object);
      };
    }
  }, [sceneState, initialPosition]);

  useEffect(() => {
    if (objectRef.current) {
      updatePosition(objectRef.current, initialPosition, 1000);
    }
  }, [initialPosition]);

  const handleClick = useCallback(() => {
    setIsFlipped((prev) => !prev);
    if (objectRef.current) {
      const duration = 1000; // 1 second
      const newRotation = new THREE.Euler(0, isFlipped ? 0 : Math.PI, 0);
      updateRotation(objectRef.current, newRotation, duration);
    }
    onNodeClick(repoName);
  }, [isFlipped, onNodeClick, repoName]);

  const handleHover = useCallback((isHovering) => {
    if (objectRef.current) {
      const duration = 300; // 0.3 seconds
      const newScale = new THREE.Vector3(isHovering ? 1.1 : 1, isHovering ? 1.1 : 1, isHovering ? 1.1 : 1);
      updateScale(objectRef.current, newScale, duration);
    }
  }, []);

  return (
    <div ref={nodeRef}>
      <div 
        className="dream-talk" 
        onClick={handleClick} 
        onMouseEnter={() => handleHover(true)}
        onMouseLeave={() => handleHover(false)}
      >
        <DreamTalk repoName={repoName} mediaContent={mediaContent} />
      </div>
      <div 
        className="dream-song" 
        onClick={handleClick}
        onMouseEnter={() => handleHover(true)}
        onMouseLeave={() => handleHover(false)}
      >
        <DreamSong repoName={repoName} mediaContent={mediaContent} />
      </div>
    </div>
  );
};

export default React.memo(DreamNode);
