import React, { useState, useCallback, createContext, useContext } from 'react';

interface ContextMenuItem {
  label: string;
  action: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
}

interface ContextMenuContextType {
  showContextMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
  hideContextMenu: () => void;
}

const ContextMenuContext = createContext<ContextMenuContextType | null>(null);

export function useContextMenu() {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error('useContextMenu must be used within ContextMenuProvider');
  }
  return context;
}

export function ContextMenuProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    items: [],
  });

  const showContextMenu = useCallback((x: number, y: number, items: ContextMenuItem[]) => {
    setState({ visible: true, x, y, items });
  }, []);

  const hideContextMenu = useCallback(() => {
    setState((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <ContextMenuContext.Provider value={{ showContextMenu, hideContextMenu }}>
      {children}
      {state.visible && (
        <ContextMenuOverlay
          x={state.x}
          y={state.y}
          items={state.items}
          onClose={hideContextMenu}
        />
      )}
    </ContextMenuContext.Provider>
  );
}

interface ContextMenuOverlayProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

function ContextMenuOverlay({ x, y, items, onClose }: ContextMenuOverlayProps) {
  // Adjust position to stay within viewport
  const adjustedStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - items.length * 32 - 20),
    zIndex: 10000,
  };

  return (
    <>
      <div
        className="context-menu-overlay"
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }}
      />
      <div className="context-menu" style={adjustedStyle}>
        {items.map((item, index) => (
          <div
            key={index}
            className={`context-menu-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}`}
            onClick={() => {
              if (!item.disabled) {
                item.action();
                onClose();
              }
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </>
  );
}

// Simple standalone context menu component
export default function ContextMenu() {
  const [state, setState] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    items: [],
  });

  // Listen for custom event
  React.useEffect(() => {
    const handleShowContextMenu = (e: CustomEvent) => {
      e.preventDefault();
      setState({
        visible: true,
        x: e.detail.x,
        y: e.detail.y,
        items: e.detail.items,
      });
    };

    window.addEventListener('showContextMenu', handleShowContextMenu as EventListener);

    return () => {
      window.removeEventListener('showContextMenu', handleShowContextMenu as EventListener);
    };
  }, []);

  const handleClose = () => {
    setState((prev) => ({ ...prev, visible: false }));
  };

  if (!state.visible) return null;

  const adjustedStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(state.x, window.innerWidth - 200),
    top: Math.min(state.y, window.innerHeight - state.items.length * 32 - 20),
    zIndex: 10000,
  };

  return (
    <>
      <div
        onClick={handleClose}
        onContextMenu={(e) => {
          e.preventDefault();
          handleClose();
        }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
        }}
      />
      <div className="context-menu" style={adjustedStyle}>
        {state.items.map((item, index) => (
          <div
            key={index}
            className={`context-menu-item ${item.danger ? 'danger' : ''} ${item.disabled ? 'disabled' : ''}`}
            onClick={() => {
              if (!item.disabled) {
                item.action();
                handleClose();
              }
            }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </>
  );
}

// Helper function to show context menu
export function showContextMenu(x: number, y: number, items: ContextMenuItem[]) {
  const event = new CustomEvent('showContextMenu', {
    detail: { x, y, items },
  });
  window.dispatchEvent(event);
}
