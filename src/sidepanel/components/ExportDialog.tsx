import React, { useState, useCallback } from 'react';
import { useStore } from '../store';

interface ExportDialogProps {
  onClose: () => void;
}

export default function ExportDialog({ onClose }: ExportDialogProps) {
  const { spaces, folders, tabs, currentSpaceId } = useStore();
  const [exportFormat, setExportFormat] = useState<'json' | 'html'>('json');
  const [exportScope, setExportScope] = useState<'all' | 'current'>('all');

  const generateHtmlBookmarks = useCallback(() => {
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>SideSpace Export</TITLE>
<H1>SideSpace Spaces</H1>
<DL><p>
`;

    const spacesToExport = exportScope === 'current'
      ? { [currentSpaceId || '']: spaces[currentSpaceId || ''] }
      : spaces;

    for (const space of Object.values(spacesToExport).filter(Boolean)) {
      html += `    <DT><H3>${escapeHtml(space.name)}</H3>\n`;
      html += `    <DL><p>\n`;

      // Add folders in this space
      const spaceFolders = Object.values(folders)
        .filter((f) => f.spaceId === space.id && !f.parentId);

      for (const folder of spaceFolders) {
        html += generateFolderHtml(folder.id, folders, tabs, 8);
      }

      // Add root tabs in this space
      const spaceTabs = Object.values(tabs)
        .filter((t) => t.spaceId === space.id && !t.folderId)
        .sort((a, b) => a.order - b.order);

      for (const tab of spaceTabs) {
        html += `        <DT><A HREF="${escapeHtml(tab.url)}">${escapeHtml(tab.customTitle || tab.title)}</A>\n`;
      }

      html += `    </DL><p>\n`;
    }

    html += `</DL><p>`;
    return html;
  }, [spaces, folders, tabs, currentSpaceId, exportScope]);

  const generateFolderHtml = (
    folderId: string,
    folders: Record<string, any>,
    tabs: Record<string, any>,
    indent: number
  ): string => {
    const folder = folders[folderId];
    if (!folder) return '';

    const indentStr = ' '.repeat(indent);
    let html = `${indentStr}<DT><H3>${escapeHtml(folder.name)}</H3>\n`;
    html += `${indentStr}<DL><p>\n`;

    // Add child folders
    const childFolders = Object.values(folders)
      .filter((f) => f.parentId === folderId);

    for (const child of childFolders) {
      html += generateFolderHtml(child.id, folders, tabs, indent + 4);
    }

    // Add tabs in this folder
    const folderTabs = Object.values(tabs)
      .filter((t) => t.folderId === folderId)
      .sort((a, b) => a.order - b.order);

    for (const tab of folderTabs) {
      html += `${' '.repeat(indent + 4)}<DT><A HREF="${escapeHtml(tab.url)}">${escapeHtml(tab.customTitle || tab.title)}</A>\n`;
    }

    html += `${indentStr}</DL><p>\n`;
    return html;
  };

  const escapeHtml = (str: string): string => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  };

  const handleExport = () => {
    let content: string;
    let filename: string;
    let mimeType: string;

    if (exportFormat === 'json') {
      const dataToExport = exportScope === 'current'
        ? {
            version: '1.0',
            exportDate: new Date().toISOString(),
            space: spaces[currentSpaceId || ''],
            folders: Object.values(folders).filter((f) => f.spaceId === currentSpaceId),
            tabs: Object.values(tabs).filter((t) => t.spaceId === currentSpaceId),
          }
        : {
            version: '1.0',
            exportDate: new Date().toISOString(),
            spaces,
            folders,
            tabs,
          };

      content = JSON.stringify(dataToExport, null, 2);
      filename = `sidespace-export-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    } else {
      content = generateHtmlBookmarks();
      filename = `sidespace-bookmarks-${new Date().toISOString().split('T')[0]}.html`;
      mimeType = 'text/html';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    onClose();
  };

  const spaceCount = Object.keys(spaces).length;
  const tabCount = Object.keys(tabs).length;
  const currentSpace = spaces[currentSpaceId || ''];
  const currentSpaceTabCount = Object.values(tabs).filter((t) => t.spaceId === currentSpaceId).length;

  return (
    <div className="import-dialog-overlay" onClick={onClose}>
      <div className="import-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Export Data</h2>

        <div style={{ marginTop: '16px' }}>
          <p style={{ marginBottom: '8px', fontWeight: 500 }}>Export Scope:</p>
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="scope"
              value="all"
              checked={exportScope === 'all'}
              onChange={() => setExportScope('all')}
              style={{ marginRight: '8px' }}
            />
            All Spaces ({spaceCount} spaces, {tabCount} tabs)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              name="scope"
              value="current"
              checked={exportScope === 'current'}
              onChange={() => setExportScope('current')}
              style={{ marginRight: '8px' }}
              disabled={!currentSpaceId}
            />
            Current Space ({currentSpace?.name || 'None'} - {currentSpaceTabCount} tabs)
          </label>
        </div>

        <div style={{ marginTop: '16px' }}>
          <p style={{ marginBottom: '8px', fontWeight: 500 }}>Export Format:</p>
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="format"
              value="json"
              checked={exportFormat === 'json'}
              onChange={() => setExportFormat('json')}
              style={{ marginRight: '8px' }}
            />
            JSON (Full backup, can be re-imported)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="radio"
              name="format"
              value="html"
              checked={exportFormat === 'html'}
              onChange={() => setExportFormat('html')}
              style={{ marginRight: '8px' }}
            />
            HTML Bookmarks (Can import to any browser)
          </label>
        </div>

        <div className="dialog-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={handleExport}>
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
