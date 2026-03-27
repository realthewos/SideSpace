import React, { useState, useRef } from 'react';
import { useStore } from '../store';

interface ImportDialogProps {
  onClose: () => void;
}

export default function ImportDialog({ onClose }: ImportDialogProps) {
  const { loadData, createSpace } = useStore();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      setSuccess(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const content = await selectedFile.text();
      let data;

      try {
        data = JSON.parse(content);
      } catch {
        // Try parsing as HTML bookmarks
        data = content;
      }

      // Send to background for processing
      chrome.runtime.sendMessage(
        {
          type: 'IMPORT_ARC_DATA',
          payload: { data, fileName: selectedFile.name },
        },
        async (response) => {
          if (response?.success && response.data) {
            const result = response.data;
            await loadData();

            if (result.errors && result.errors.length > 0) {
              setError(`Imported with warnings: ${result.errors.join(', ')}`);
            } else {
              setSuccess(
                `Successfully imported ${result.spacesImported} spaces, ${result.foldersImported} folders, and ${result.tabsImported} tabs.`
              );
            }
          } else {
            setError(response?.error || response?.data?.errors?.join(', ') || 'Import failed');
          }
          setImporting(false);
        }
      );
    } catch (e: any) {
      setError(`Failed to read file: ${e.message}`);
      setImporting(false);
    }
  };

  const handleCreateEmptySpace = async () => {
    const name = prompt('Space name:', 'My Space');
    if (name) {
      await createSpace({ name, icon: '📁' });
      onClose();
    }
  };

  return (
    <div className="import-dialog-overlay" onClick={onClose}>
      <div className="import-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Import Data</h2>

        <p>Import your Arc browser data or create a new space.</p>

        <div className="file-input-wrapper">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.html"
            onChange={handleFileSelect}
          />
          <label
            className="file-input-label"
            onClick={() => fileInputRef.current?.click()}
          >
            {selectedFile ? (
              <span>📄 {selectedFile.name}</span>
            ) : (
              <span>
                Click to select a file
                <br />
                <small style={{ color: 'var(--text-secondary)' }}>
                  Supports: StorableSidebar.json, Bookmarks JSON, HTML bookmarks
                </small>
              </span>
            )}
          </label>
        </div>

        {error && (
          <p style={{ color: 'var(--danger-color)', marginTop: '8px', fontSize: '12px' }}>
            {error}
          </p>
        )}

        {success && (
          <p style={{ color: 'green', marginTop: '8px', fontSize: '12px' }}>
            {success}
          </p>
        )}

        <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            <strong>How to export from Arc:</strong>
          </p>
          <ol style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '16px' }}>
            <li>Close Arc browser</li>
            <li>Open Finder and press Cmd+Shift+G</li>
            <li>Paste: ~/Library/Application Support/Arc/User Data/Default/</li>
            <li>Copy "StorableSidebar.json" file</li>
          </ol>
        </div>

        <div className="dialog-actions">
          <button onClick={handleCreateEmptySpace} disabled={importing}>
            Create Empty Space
          </button>
          <button onClick={onClose} disabled={importing}>
            Cancel
          </button>
          <button
            className="primary"
            onClick={handleImport}
            disabled={!selectedFile || importing}
          >
            {importing ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
