import React, { useMemo, useRef } from 'react';
import { useDrop } from 'react-dnd';
import { useStore } from '../store';
import TabItem from './TabItem';
import FolderTree from './FolderTree';
import { showContextMenu } from './ContextMenu';
import type { Tab, Folder } from '../../shared/types';

interface TabListProps {
  spaceId: string | null;
}

export default function TabList({ spaceId }: TabListProps) {
  const { tabs, folders, searchQuery, createTab, createFolder, moveTab, updateSettings } = useStore();
  const listRef = useRef<HTMLDivElement>(null);

  // Filter and organize items for current space
  const { rootFolders, rootTabs } = useMemo(() => {
    if (!spaceId) {
      return { rootFolders: [], rootTabs: [] };
    }

    // Get folders in this space (root level only)
    const spaceFolders = Object.values(folders)
      .filter((f) => f.spaceId === spaceId && !f.parentId)
      .sort((a, b) => a.order - b.order);

    // Get tabs in this space (root level only - not in folders)
    let spaceTabs = Object.values(tabs)
      .filter((t) => t.spaceId === spaceId && !t.folderId)
      .sort((a, b) => a.order - b.order);

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      spaceTabs = spaceTabs.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.url.toLowerCase().includes(query)
      );
    }

    return { rootFolders: spaceFolders, rootTabs: spaceTabs };
  }, [spaceId, folders, tabs, searchQuery]);

  const [{ isOver }, drop] = useDrop({
    accept: 'TAB',
    drop: (item: any, monitor) => {
      if (monitor.didDrop()) return;
      if (spaceId) {
        moveTab(item.id, spaceId, null);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  drop(listRef);

  if (!spaceId) {
    return <div className="empty-state">Select a space to view tabs</div>;
  }

  const handleAddFolder = async () => {
    const name = prompt('Folder name:', 'New Folder');
    if (name) {
      await createFolder({
        spaceId,
        name,
      });
    }
  };

  const handleAddTab = async () => {
    const url = prompt('Enter URL:');
    if (url) {
      await createTab({
        spaceId,
        title: url,
        url,
      });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, [
      {
        label: 'Add Tab',
        action: handleAddTab,
      },
      {
        label: 'Add Folder',
        action: handleAddFolder,
      },
      {
        label: 'Export Space',
        action: () => handleExportSpace(),
      },
      {
        label: 'Sync Chrome Tabs',
        action: () => {
          chrome.runtime.sendMessage({ type: 'SYNC_TABS' });
          updateSettings({ defaultSpaceId: spaceId });
        },
      },
    ]);
  };

  const handleExportSpace = async () => {
    const spaceFolders = Object.values(folders).filter((f) => f.spaceId === spaceId);
    const spaceTabs = Object.values(tabs).filter((t) => t.spaceId === spaceId);

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      spaceId,
      folders: spaceFolders,
      tabs: spaceTabs,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sidespace-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMoveTab = (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => {
    const draggedTab = tabs[draggedId];
    const targetTab = tabs[targetId];

    if (!draggedTab || !targetTab) return;

    if (position === 'inside') {
      // Move into the same folder as target
      moveTab(draggedId, targetTab.spaceId, targetTab.folderId);
    } else {
      // Move to same position as target
      moveTab(draggedId, targetTab.spaceId, targetTab.folderId);
    }
  };

  const handleMergeTabs = async (tabId1: string, tabId2: string) => {
    // Send message to background to create split view
    chrome.runtime.sendMessage(
      {
        type: 'CREATE_SPLIT_VIEW',
        payload: { tabId1, tabId2 },
      },
      (response) => {
        if (response?.success) {
          console.log('Split view created:', response.data);
        } else {
          alert('Failed to create split view: ' + (response?.error || 'Unknown error'));
        }
      }
    );
  };

  return (
    <div
      ref={listRef}
      className={`tab-list ${isOver ? 'drop-target-list' : ''}`}
      onContextMenu={handleContextMenu}
    >
      {/* Quick actions */}
      <div style={{ padding: '8px 12px', display: 'flex', gap: '8px' }}>
        <button
          onClick={handleAddFolder}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          + Folder
        </button>
        <button
          onClick={handleAddTab}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          + Tab
        </button>
        <button
          onClick={handleExportSpace}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            cursor: 'pointer',
            marginLeft: 'auto',
          }}
          title="Export this space"
        >
          Export
        </button>
      </div>

      {/* Folders */}
      {rootFolders.map((folder) => (
        <FolderTree key={folder.id} folder={folder} depth={0} onMoveTab={handleMoveTab} onMergeTabs={handleMergeTabs} />
      ))}

      {/* Root level tabs */}
      {rootTabs.map((tab) => (
        <TabItem key={tab.id} tab={tab} depth={0} onMoveTab={handleMoveTab} onMergeTabs={handleMergeTabs} />
      ))}

      {rootFolders.length === 0 && rootTabs.length === 0 && (
        <div className="empty-state">
          {searchQuery ? 'No matching tabs' : 'No tabs in this space. Right-click to add.'}
        </div>
      )}
    </div>
  );
}
