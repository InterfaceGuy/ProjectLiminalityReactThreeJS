import React, { useState, useEffect } from 'react';
import { BLACK, BLUE, WHITE } from '../constants/colors';
import SearchComponent from './SemanticSearch/src/SearchComponent';

const SearchPanel = ({ isOpen, onSearch, onClose, repoNames }) => {
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
        onSearch([]); // Reset search results
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [onClose, onSearch]);

  if (!isOpen) return null;

  const handleSearchStart = () => {
    // You can add any logic needed when search starts
  };

  const handleSearchComplete = (results) => {
    const formattedResults = results.map(([name, similarity]) => ({
      repoName: name,
      similarity: similarity
    }));
    setSearchResults(formattedResults);
    onSearch(formattedResults); // Pass the semantic search results to the main app
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: BLACK,
      color: WHITE,
      padding: '10px',
      borderRadius: '8px',
      zIndex: 1000,
      boxShadow: `0 0 0 2px ${BLUE}`,
    }}>
      <SearchComponent
        maxResults={5} // You can adjust this or make it a prop
        targets={repoNames} // Provide the repo names as targets for semantic search
        onSearchStart={handleSearchStart}
        onSearchComplete={handleSearchComplete}
      />
      {/* Display search results */}
      <div style={{ marginTop: '10px', maxHeight: '300px', overflowY: 'auto' }}>
        {searchResults.map(({ repoName, similarity }) => (
          <div key={repoName} style={{ marginBottom: '5px' }}>
            {repoName}: {similarity.toFixed(4)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchPanel;
