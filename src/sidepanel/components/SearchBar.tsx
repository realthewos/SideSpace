import React from 'react';
import { useStore } from '../store';

export default function SearchBar() {
  const { searchQuery, setSearchQuery } = useStore();

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Search tabs..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
    </div>
  );
}
