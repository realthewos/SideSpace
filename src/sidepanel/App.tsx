import React, { useEffect, useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useStore } from './store';
import SpaceSelector from './components/SpaceSelector';
import TabList from './components/TabList';
import SearchBar from './components/SearchBar';
import ImportDialog from './components/ImportDialog';
import ExportDialog from './components/ExportDialog';
import ContextMenu from './components/ContextMenu';

export default function App() {
  const { spaces, isLoading, loadData, currentSpaceId } = useStore();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + F to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-bar input') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }

      // Cmd/Ctrl + N to create new space
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowImportDialog(true);
      }

      // Cmd/Ctrl + E to export
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        setShowExportDialog(true);
      }

      // Escape to close dialogs
      if (e.key === 'Escape') {
        if (showImportDialog) setShowImportDialog(false);
        if (showExportDialog) setShowExportDialog(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showImportDialog, showExportDialog]);

  if (isLoading) {
    return (
      <div className="app-container">
        <div className="empty-state">Loading...</div>
      </div>
    );
  }

  const hasSpaces = Object.keys(spaces).length > 0;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="app-container">
        <header className="app-header">
          <SpaceSelector />
          <div className="header-actions">
            {hasSpaces && (
              <button onClick={() => setShowExportDialog(true)} title="Export data (Cmd+E)">
                Export
              </button>
            )}
            <button onClick={() => setShowImportDialog(true)} title="Import data (Cmd+N)">
              Import
            </button>
          </div>
        </header>

        <SearchBar />

        <main className="app-main">
          {!hasSpaces ? (
            <div className="empty-state">
              <p>No spaces yet</p>
              <p style={{ fontSize: '12px', marginTop: '8px', color: 'var(--text-secondary)' }}>
                Create a new space or import from Arc browser
              </p>
              <button
                onClick={() => setShowImportDialog(true)}
                style={{
                  marginTop: '16px',
                  padding: '10px 20px',
                  cursor: 'pointer',
                  background: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                Get Started
              </button>
            </div>
          ) : (
            <TabList spaceId={currentSpaceId} />
          )}
        </main>

        {showImportDialog && (
          <ImportDialog onClose={() => setShowImportDialog(false)} />
        )}

        {showExportDialog && (
          <ExportDialog onClose={() => setShowExportDialog(false)} />
        )}

        <ContextMenu />
      </div>
    </DndProvider>
  );
}
