import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import WebGL from 'three/addons/capabilities/WebGL.js';
import { CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import DreamNodeGrid from './DreamNodeGrid';
import { scanDreamVault } from '../services/electronService';

function Three() {
  const refContainer = useRef(null);
  const [dreamNodes, setDreamNodes] = useState([]);
  const [sceneState, setSceneState] = useState(null);
  const [error, setError] = useState(null);

  console.log('Three component rendering');

  const initScene = useCallback(() => {
    console.log('Initializing scene');
    if (!refContainer.current) {
      console.error('Container ref is not available');
      setError('Container ref is not available');
      return null;
    }

    if (!WebGL.isWebGLAvailable()) {
      const warning = WebGL.getWebGLErrorMessage();
      console.error('WebGL is not available:', warning);
      setError('WebGL is not available: ' + warning);
      return null;
    }

    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);

      const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.z = 1000;

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      refContainer.current.appendChild(renderer.domElement);

      const cssRenderer = new CSS3DRenderer();
      cssRenderer.setSize(window.innerWidth, window.innerHeight);
      cssRenderer.domElement.style.position = 'absolute';
      cssRenderer.domElement.style.top = '0';
      refContainer.current.appendChild(cssRenderer.domElement);

      const controls = new OrbitControls(camera, cssRenderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.25;
      controls.enableZoom = true;

      const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        cssRenderer.setSize(window.innerWidth, window.innerHeight);
      };

      window.addEventListener('resize', handleResize);

      console.log('Scene initialized successfully');
      return {
        scene,
        camera,
        renderer,
        cssRenderer,
        controls,
        cleanup: () => {
          window.removeEventListener('resize', handleResize);
          renderer.dispose();
          cssRenderer.dispose();
          controls.dispose();
        }
      };
    } catch (error) {
      console.error('Error initializing scene:', error);
      setError('Error initializing scene: ' + error.message);
      return null;
    }
  }, []);

  useEffect(() => {
    console.log('Setting up scene');
    const newSceneState = initScene();
    if (newSceneState) {
      setSceneState(newSceneState);

      const fetchDreamNodes = async () => {
        try {
          const repos = await scanDreamVault();
          console.log('Scanned dream vault:', repos);
          setDreamNodes(repos.map(repo => ({ repoName: repo })));
        } catch (error) {
          console.error('Error scanning dream vault:', error);
          setError('Error scanning dream vault: ' + error.message);
        }
      };

      fetchDreamNodes();
    }

    return () => {
      if (newSceneState) {
        console.log('Cleaning up scene');
        newSceneState.cleanup();
      }
    };
  }, [initScene]);

  useEffect(() => {
    if (!sceneState) return;

    const { scene, camera, renderer, cssRenderer, controls } = sceneState;
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      cssRenderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [sceneState]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!sceneState || dreamNodes.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div ref={refContainer}>
      {sceneState && (
        <DreamNodeGrid
          scene={sceneState.scene}
          camera={sceneState.camera}
          dreamNodes={dreamNodes}
        />
      )}
    </div>
  );
}

export default Three;
