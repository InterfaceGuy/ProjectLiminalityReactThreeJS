import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import DreamNode from './DreamNode';

const ANIMATION_DURATION = 2000; // 2 seconds

const DreamGraph = ({ cssScene, dreamNodes: initialDreamNodes, onNodeClick }) => {
  const [layout, setLayout] = useState('grid');
  const [centeredNode, setCenteredNode] = useState(null);
  const [dreamNodes, setDreamNodes] = useState([]);
  const nodeRefs = useRef({});

  const calculateGridPositions = useCallback(() => {
    console.log('Calculating grid positions');
    const gridSize = Math.ceil(Math.sqrt(dreamNodes.length));
    const spacing = 350; // Reduced spacing
    return dreamNodes.map((_, index) => {
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      const x = (col - gridSize / 2 + 0.5) * spacing;
      const y = (gridSize / 2 - row - 0.5) * spacing;
      const z = 0;
      return new THREE.Vector3(x, y, z);
    });
  }, [dreamNodes]);

  const calculateCirclePositions = useCallback(() => {
    console.log('Calculating circle positions');
    const radius = dreamNodes.length * 30; // Halved radius
    return dreamNodes.map((_, index) => {
      const angle = (index / dreamNodes.length) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const z = 0;
      return new THREE.Vector3(x, y, z);
    });
  }, [dreamNodes]);

  const calculatePositions = useCallback(() => {
    console.log('Calculating positions for layout:', layout);
    return layout === 'grid' ? calculateGridPositions() : calculateCirclePositions();
  }, [layout, calculateGridPositions, calculateCirclePositions]);

  useEffect(() => {
    console.log('Setting initial dream nodes:', initialDreamNodes);
    setDreamNodes(initialDreamNodes);
  }, [initialDreamNodes]);

  useEffect(() => {
    console.log('Updating node positions');
    const positions = calculatePositions();
    dreamNodes.forEach((node, index) => {
      const dreamNodeRef = nodeRefs.current[node.repoName];
      if (dreamNodeRef) {
        const newPosition = positions[index].clone();
        if (centeredNode && node.repoName === centeredNode) {
          newPosition.set(0, 0, 500);
        }
        console.log(`Updating position for ${node.repoName}:`, newPosition);
        dreamNodeRef.updatePosition(newPosition, ANIMATION_DURATION);
      }
    });
  }, [dreamNodes, layout, centeredNode, calculatePositions]);

  const toggleLayout = useCallback(() => {
    console.log('Toggling layout');
    setLayout(prevLayout => {
      const newLayout = prevLayout === 'grid' ? 'circle' : 'grid';
      console.log('New layout:', newLayout);
      return newLayout;
    });
    setCenteredNode(null);
  }, []);

  const handleNodeClick = useCallback((repoName) => {
    console.log('Node clicked:', repoName);
    setCenteredNode(repoName === centeredNode ? null : repoName);
    const dreamNodeRef = nodeRefs.current[repoName];
    if (dreamNodeRef) {
      console.log('Flipping node:', repoName);
      dreamNodeRef.flip();
    }
    onNodeClick(repoName);
  }, [centeredNode, onNodeClick]);

  return (
    <>
      {dreamNodes.map((node, index) => (
        <DreamNode
          key={node.repoName}
          ref={(el) => {
            if (el) {
              nodeRefs.current[node.repoName] = el;
            }
          }}
          initialPosition={calculatePositions()[index]}
          repoName={node.repoName}
          onNodeClick={handleNodeClick}
          cssScene={cssScene}
        />
      ))}
      <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 1000 }}>
        <button onClick={toggleLayout}>Toggle Layout</button>
      </div>
    </>
  );
};

export default React.memo(DreamGraph);
