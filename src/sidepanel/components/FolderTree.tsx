import React, { useState, useMemo, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useStore } from '../store';
import TabItem from './TabItem';
import { showContextMenu } from './ContextMenu';
import type { Folder } from '../../shared/types';

interface FolderTreeProps {
  folder: Folder;
  depth: number;
  onMoveTab?: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
  onMergeTabs?: (tabId1: string, tabId2: string) => void;
}

interface DragItem {
  id: string;
  type: 'TAB' | 'FOLDER';
  index: number;
}

export default function FolderTree({ folder, depth, onMoveTab, onMergeTabs }: FolderTreeProps) {
  const { folders, tabs, updateFolder, deleteFolder, createTab, moveTab } = useStore();
  const [isExpanded, setIsExpanded] = useState(folder.isExpanded);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(folder.name);
  const ref = useRef<HTMLDivElement>(null);

  // Get child folders and tabs
  const { childFolders, childTabs } = useMemo(() => {
    const childFolders = Object.values(folders)
      .filter((f) => f.parentId === folder.id)
      .sort((a, b) => a.order - b.order);

    const childTabs = Object.values(tabs)
      .filter((t) => t.folderId === folder.id)
      .sort((a, b) => a.order - b.order);

    return { childFolders, childTabs };
  }, [folders, tabs, folder.id]);

  const [{ isDragging }, drag] = useDrag({
    type: 'FOLDER',
    item: { id: folder.id, type: 'FOLDER', index: folder.order },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ['TAB', 'FOLDER'],
    drop: (item: DragItem, monitor) => {
      if (monitor.didDrop()) return;

      if (item.type === 'TAB') {
        moveTab(item.id, folder.spaceId, folder.id);
      }
      // TODO: Handle folder drop
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  drag(drop(ref));

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    updateFolder(folder.id, { isExpanded: newExpanded });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleNameSave = () => {
    if (editName.trim()) {
      updateFolder(folder.id, { name: editName.trim() });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditName(folder.name);
      setIsEditing(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this folder and all its contents?')) {
      deleteFolder(folder.id);
    }
  };

  const handleAddTab = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = prompt('Enter URL:');
    if (url) {
      await createTab({
        spaceId: folder.spaceId,
        folderId: folder.id,
        title: url,
        url,
      });
      setIsExpanded(true);
    }
  };

  const handleContextMenuEvent = (e: React.MouseEvent) => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, [
      {
        label: 'Add Tab',
        action: async () => {
          const url = prompt('Enter URL:');
          if (url) {
            await createTab({
              spaceId: folder.spaceId,
              folderId: folder.id,
              title: url,
              url,
            });
            setIsExpanded(true);
          }
        },
      },
      {
        label: 'Rename',
        action: () => setIsEditing(true),
      },
      {
        label: 'Expand All',
        action: () => {
          updateFolder(folder.id, { isExpanded: true });
          setIsExpanded(true);
        },
      },
      {
        label: 'Collapse All',
        action: () => {
          updateFolder(folder.id, { isExpanded: false });
          setIsExpanded(false);
        },
      },
      {
        label: 'Delete',
        action: () => {
          if (confirm('Delete this folder and all its contents?')) {
            deleteFolder(folder.id);
          }
        },
        danger: true,
      },
    ]);
  };

  return (
    <div className="folder-tree">
      <div
        ref={ref}
        className={`folder-header ${isOver && canDrop ? 'drag-over' : ''} ${isDragging ? 'dragging' : ''}`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
        onContextMenu={handleContextMenuEvent}
      >
        <button className="expand-btn" onClick={handleToggle}>
          {isExpanded ? '▼' : '▶'}
        </button>

        <span className="folder-icon">{folder.icon || '📁'}</span>

        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            autoFocus
            style={{ flex: 1 }}
          />
        ) : (
          <span className="folder-name" onDoubleClick={handleDoubleClick}>
            {folder.name}
          </span>
        )}

        <div className="tab-actions" style={{ opacity: 1 }}>
          <button className="close-btn" onClick={handleAddTab} title="Add tab">
            +
          </button>
          <button className="close-btn" onClick={handleDelete} title="Delete">
            ×
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="folder-children">
          {/* Render child folders recursively */}
          {childFolders.map((childFolder) => (
            <FolderTree
              key={childFolder.id}
              folder={childFolder}
              depth={depth + 1}
              onMoveTab={onMoveTab}
              onMergeTabs={onMergeTabs}
            />
          ))}

          {/* Render child tabs */}
          {childTabs.map((tab) => (
            <TabItem key={tab.id} tab={tab} depth={depth + 1} onMoveTab={onMoveTab} onMergeTabs={onMergeTabs} />
          ))}
        </div>
      )}
    </div>
  );
}
