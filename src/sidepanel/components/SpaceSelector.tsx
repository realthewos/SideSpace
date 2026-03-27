import React from 'react';
import { useStore } from '../store';
import { showContextMenu } from './ContextMenu';

export default function SpaceSelector() {
  const { spaces, currentSpaceId, setCurrentSpace, createSpace, updateSpace, deleteSpace } = useStore();

  const handleCreateSpace = async () => {
    const name = prompt('Space name:', 'New Space');
    if (name) {
      await createSpace({
        name,
        icon: '📁',
      });
    }
  };

  const handleEditSpace = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentSpaceId) return;

    const space = spaces[currentSpaceId];
    if (!space) return;

    showContextMenu(e.clientX, e.clientY, [
      {
        label: 'Rename',
        action: () => {
          const newName = prompt('Space name:', space.name);
          if (newName) {
            updateSpace(currentSpaceId, { name: newName });
          }
        },
      },
      {
        label: 'Change Icon',
        action: () => {
          const icon = prompt('Icon (emoji):', space.icon || '📁');
          if (icon) {
            updateSpace(currentSpaceId, { icon });
          }
        },
      },
      {
        label: 'Set as Default',
        action: () => {
          useStore.getState().updateSettings?.({ defaultSpaceId: currentSpaceId });
        },
      },
      {
        label: 'Delete',
        action: () => {
          if (confirm(`Delete space "${space.name}" and all its contents?`)) {
            deleteSpace(currentSpaceId);
          }
        },
      },
    ]);
  };

  const spaceList = Object.values(spaces).sort((a, b) => a.order - b.order);
  const currentSpace = currentSpaceId ? spaces[currentSpaceId] : null;

  return (
    <div className="space-selector">
      <select
        value={currentSpaceId || ''}
        onChange={(e) => setCurrentSpace(e.target.value)}
        className="space-dropdown"
      >
        {spaceList.length === 0 && <option value="">No spaces</option>}
        {spaceList.map((space) => (
          <option key={space.id} value={space.id}>
            {space.icon} {space.name}
          </option>
        ))}
      </select>

      {currentSpace && (
        <button
          className="edit-space-btn"
          onClick={handleEditSpace}
          title="Edit current space"
        >
          ⚙️
        </button>
      )}

      <button
        className="add-space-btn"
        onClick={handleCreateSpace}
        title="Create new Space"
      >
        +
      </button>
    </div>
  );
}
