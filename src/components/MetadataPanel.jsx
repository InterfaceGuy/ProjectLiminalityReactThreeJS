import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import { readMetadata, writeMetadata, getAllRepoNamesAndTypes } from '../services/electronService';
import { BLACK, BLUE, RED, WHITE } from '../constants/colors';
import CustomNumberInput from './CustomNumberInput';
import { metadataTemplate, getDefaultValue } from '../utils/metadataTemplate';

const MetadataPanel = ({ isOpen, onClose, repoName }) => {
  const [metadata, setMetadata] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [relatedNodesOptions, setRelatedNodesOptions] = useState([]);

  useEffect(() => {
    if (isOpen && repoName) {
      loadMetadata();
    }
  }, [isOpen, repoName]);

  useEffect(() => {
    if (metadata.type) {
      fetchRelatedNodesOptions();
    }
  }, [metadata.type]);

  const loadMetadata = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await readMetadata(repoName);
      // Ensure all fields have a default value
      const defaultMetadata = {
        ...metadataTemplate,
        ...data
      };
      setMetadata(defaultMetadata);
    } catch (err) {
      setError('Failed to load metadata');
      console.error('Error loading metadata:', err);
    }
    setIsLoading(false);
  };

  const fetchRelatedNodesOptions = async () => {
    try {
      const repos = await getAllRepoNamesAndTypes();
      const currentNodeType = metadata.type;
      const filteredRepos = repos.filter(repo => repo.type !== currentNodeType);
      setRelatedNodesOptions(filteredRepos.map(repo => ({ value: repo.name, label: repo.name })));
    } catch (error) {
      console.error('Error fetching repo names and types:', error);
      setRelatedNodesOptions([]);
    }
  };

  const handleInputChange = (key, value) => {
    setMetadata(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    try {
      await writeMetadata(repoName, metadata);
      onClose();
    } catch (err) {
      setError('Failed to save metadata: ' + err.message);
      console.error('Error saving metadata:', err);
    }
  };

  const renderInput = (key, value) => {
    if (key === 'type') {
      return (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <label style={{ marginRight: '10px', color: BLUE }}>
            <input
              type="radio"
              value="idea"
              checked={value === 'idea'}
              onChange={() => handleInputChange(key, 'idea')}
              style={{ accentColor: BLUE }}
            /> Idea
          </label>
          <label style={{ color: RED }}>
            <input
              type="radio"
              value="person"
              checked={value === 'person'}
              onChange={() => handleInputChange(key, 'person')}
              style={{ accentColor: RED }}
            /> Person
          </label>
        </div>
      );
    } else if (key === 'interactions') {
      return (
        <CustomNumberInput
          value={value || 0}
          onChange={(newValue) => handleInputChange(key, newValue)}
        />
      );
    } else if (key === 'relatedNodes') {
      return (
        <Select
          isMulti
          options={relatedNodesOptions}
          value={Array.isArray(value) ? value.map(v => ({ value: v, label: v })) : []}
          onChange={(selectedOptions) => {
            handleInputChange(key, selectedOptions ? selectedOptions.map(option => option.value) : []);
          }}
          styles={{
            control: (provided) => ({
              ...provided,
              backgroundColor: BLACK,
              borderColor: BLUE,
              width: '450px',
              '&:hover': {
                borderColor: RED
              }
            }),
            menu: (provided) => ({
              ...provided,
              backgroundColor: BLACK,
            }),
            option: (provided, state) => ({
              ...provided,
              backgroundColor: state.isFocused 
                ? (metadata.type === 'idea' ? BLUE : RED) 
                : BLACK,
              color: WHITE,
            }),
            multiValue: (provided) => ({
              ...provided,
              backgroundColor: BLACK,
              border: `2px solid ${metadata.type === 'idea' ? RED : BLUE}`,
            }),
            multiValueLabel: (provided) => ({
              ...provided,
              color: WHITE,
            }),
            multiValueRemove: (provided) => ({
              ...provided,
              color: WHITE,
              ':hover': {
                backgroundColor: metadata.type === 'idea' ? RED : BLUE,
                color: WHITE,
              },
            }),
          }}
        />
      );
    } else if (key === 'friendsToNotify') {
      return (
        <div style={{ maxHeight: '200px', overflowY: 'auto', border: `1px solid ${BLUE}`, padding: '5px' }}>
          {Array.isArray(value) && value.map((friend, index) => (
            <div key={index} style={{ marginBottom: '10px', padding: '5px', border: `1px solid ${RED}` }}>
              <div>Name: {friend.name}</div>
              <div>Email: {friend.email}</div>
              <div>Common Submodules: {friend.commonSubmodules.join(', ')}</div>
            </div>
          ))}
        </div>
      );
    } else if (key === 'email') {
      return (
        <input
          type="email"
          value={value || ''}
          onChange={(e) => handleInputChange(key, e.target.value)}
          style={{ 
            width: '60%',
            padding: '5px',
            backgroundColor: BLACK,
            color: WHITE,
            border: `1px solid ${BLUE}`,
            borderRadius: '4px',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.target.style.border = `1px solid ${RED}`;
          }}
          onBlur={(e) => {
            e.target.style.border = `1px solid ${BLUE}`;
          }}
        />
      );
    } else {
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => handleInputChange(key, e.target.value)}
          style={{ 
            width: '60%',
            padding: '5px',
            backgroundColor: BLACK,
            color: WHITE,
            border: `1px solid ${BLUE}`,
            borderRadius: '4px',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.target.style.border = `1px solid ${RED}`;
          }}
          onBlur={(e) => {
            e.target.style.border = `1px solid ${BLUE}`;
          }}
        />
      );
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: BLACK,
        color: WHITE,
        padding: '20px',
        borderRadius: '8px',
        boxShadow: `0 0 0 2px ${BLUE}`,
        zIndex: 1000,
        width: '600px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <h2 style={{ color: WHITE, textAlign: 'center' }}>Metadata Editor</h2>
      {isLoading ? (
        <p>Loading metadata...</p>
      ) : error ? (
        <p style={{ color: RED }}>{error}</p>
      ) : (
        <>
          {Object.entries(metadata).map(([key, value]) => (
            <div key={key} style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <label style={{ width: '30%', marginRight: '10px', textAlign: 'right' }}>{key}:</label>
              {renderInput(key, value)}
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <button 
              onClick={onClose}
              style={{ 
                marginRight: '10px',
                padding: '5px 10px',
                backgroundColor: RED,
                color: WHITE,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              style={{ 
                padding: '5px 10px',
                backgroundColor: BLUE,
                color: WHITE,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Save
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default MetadataPanel;
