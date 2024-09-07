import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { scanDreamVault } from '../services/electronService';

const useDreamNodes = () => {
  const [dreamNodes, setDreamNodes] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDreamNodes = async (count = 30, random = true) => {
      try {
        console.log('Scanning DreamVault...');
        const repos = await scanDreamVault();
        console.log('Repos found:', repos);
        if (repos.length > 0) {
          let selectedRepos = random
            ? repos.sort(() => 0.5 - Math.random()).slice(0, count)
            : repos.slice(0, count);
          console.log('Setting DreamNodes:', selectedRepos);
          const newNodes = selectedRepos.map((repo, index) => ({
            repoName: repo,
            position: new THREE.Vector3(
              (index % 3) * 200 - 200,
              Math.floor(index / 3) * 200 - 200,
              0
            )
          }));
          setDreamNodes(newNodes);
        } else {
          console.error('No repositories found in the DreamVault');
          setError('No repositories found in the DreamVault');
        }
      } catch (error) {
        console.error('Error scanning dream vault:', error);
        setError('Error scanning dream vault: ' + error.message);
      }
    };

    fetchDreamNodes();
  }, []);

  return { dreamNodes, setDreamNodes, error };
};

export default useDreamNodes;
