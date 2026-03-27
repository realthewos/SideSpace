import React, { useState, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { useStore } from '../store';
import { showContextMenu } from './ContextMenu';
import type { Tab } from '../../shared/types';

interface TabItemProps {
  tab: Tab;
  depth: number;
  onMoveTab?: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
  onMergeTabs?: (tabId1: string, tabId2: string) => void;
}

interface DragItem {
  id: string;
  type: 'TAB';
  index: number;
  url?: string;
}

export default function TabItem({ tab, depth, onMoveTab, onMergeTabs }: TabItemProps) {
  const { updateTab, deleteTab, openTab, createFolder, tabs, moveTab } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(tab.customTitle || tab.title);
  const [isMergeTarget, setIsMergeTarget] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'TAB',
    item: { id: tab.id, type: 'TAB', index: tab.order, url: tab.url },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: () => {
      setIsMergeTarget(false);
    },
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'TAB',
    hover: (item: DragItem, monitor) => {
      if (!ref.current) return;
      if (item.id === tab.id) return;

      const hoverBoundingRect = ref.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Check if hovering in the center (for merge)
      const isCenterHover = hoverClientY > hoverMiddleY * 0.3 && hoverClientY < hoverMiddleY * 1.7;
      setIsMergeTarget(isCenterHover);
    },
    drop: (item: DragItem, monitor) => {
      if (item.id === tab.id) return;

      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      if (!hoverBoundingRect) return;

      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // If dropped in center, create split view
      if (hoverClientY > hoverMiddleY * 0.3 && hoverClientY < hoverMiddleY * 1.7) {
        if (onMergeTabs) {
          onMergeTabs(item.id, tab.id);
        }
        return;
      }

      // Otherwise, move tab
      let position: 'before' | 'after' | 'inside';
      if (hoverClientY < hoverMiddleY * 0.5) {
        position = 'before';
      } else {
        position = 'after';
      }

      if (onMoveTab) {
        onMoveTab(item.id, tab.id, position);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  drag(drop(ref));

  const handleClick = () => {
    openTab(tab.id);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleContextMenuEvent = (e: React.MouseEvent) => {
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, [
      {
        label: 'Open in New Tab',
        action: () => chrome.tabs.create({ url: tab.url }),
      },
      {
        label: 'Open in Split View',
        action: () => {
          // Prompt user to select another tab for split view
          const tabList = Object.values(tabs).filter(t => t.id !== tab.id);
          if (tabList.length === 0) {
            alert('No other tabs available for split view');
            return;
          }
          const tabNames = tabList.map(t => t.customTitle || t.title).join('\n');
          const selection = prompt(`Select a tab to split with:\n${tabNames}`);
          if (selection) {
            const selectedTab = tabList.find(t => (t.customTitle || t.title) === selection);
            if (selectedTab && onMergeTabs) {
              onMergeTabs(tab.id, selectedTab.id);
            }
          }
        },
      },
      {
        label: 'Copy URL',
        action: () => navigator.clipboard.writeText(tab.url),
      },
      {
        label: 'Edit Title',
        action: () => setIsEditing(true),
      },
      {
        label: 'Pin Tab',
        action: () => updateTab(tab.id, { isPinned: !tab.isPinned }),
      },
      {
        label: 'Delete',
        action: () => {
          if (confirm('Delete this tab?')) {
            deleteTab(tab.id);
          }
        },
        danger: true,
      },
    ]);
  };

  const handleTitleSave = () => {
    if (editTitle.trim()) {
      updateTab(tab.id, { customTitle: editTitle.trim(), title: editTitle.trim() });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setEditTitle(tab.customTitle || tab.title);
      setIsEditing(false);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this tab?')) {
      deleteTab(tab.id);
    }
  };

  return (
    <div
      ref={ref}
      className={`tab-item ${tab.isOpen ? 'active' : ''} ${isDragging ? 'dragging' : ''} ${isMergeTarget && isOver ? 'merge-target' : ''}`}
      style={{ paddingLeft: `${depth * 20 + 12}px` }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenuEvent}
    >
      <div className="tab-favicon">
        {tab.favIconUrl ? (
          <img
            src={tab.favIconUrl}
            alt=""
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <span style={{ fontSize: '12px' }}>📄</span>
        )}
      </div>

      <div className="tab-content">
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span className="tab-title" title={tab.url}>
            {tab.customTitle || tab.title}
          </span>
        )}
      </div>

      {/* Merge indicator */}
      {isMergeTarget && isOver && (
        <div className="merge-indicator">
          <span>🔗 Split View</span>
        </div>
      )}

      <div className="tab-actions">
        {tab.isPinned && <span className="pinned-icon">📌</span>}
        <button className="close-btn" onClick={handleDelete} title="Delete">
          ×
        </button>
      </div>
    </div>
  );
}
