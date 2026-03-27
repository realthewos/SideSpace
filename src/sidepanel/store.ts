import { create } from 'zustand';
import type { Space, Folder, Tab, ExtensionStorage, ExtensionSettings } from '../shared/types';

interface AppState {
  // Data
  spaces: Record<string, Space>;
  folders: Record<string, Folder>;
  tabs: Record<string, Tab>;
  settings: ExtensionSettings | null;

  // UI State
  currentSpaceId: string | null;
  selectedTabId: string | null;
  searchQuery: string;
  isLoading: boolean;

  // Actions
  loadData: () => Promise<void>;
  setCurrentSpace: (spaceId: string) => void;
  setSearchQuery: (query: string) => void;

  // Space Actions
  createSpace: (data: Partial<Space>) => Promise<Space | null>;
  updateSpace: (spaceId: string, updates: Partial<Space>) => Promise<void>;
  deleteSpace: (spaceId: string) => Promise<void>;

  // Folder Actions
  createFolder: (data: Partial<Folder>) => Promise<Folder | null>;
  updateFolder: (folderId: string, updates: Partial<Folder>) => Promise<void>;
  deleteFolder: (folderId: string) => Promise<void>;

  // Tab Actions
  createTab: (data: Partial<Tab>) => Promise<Tab | null>;
  updateTab: (tabId: string, updates: Partial<Tab>) => Promise<void>;
  deleteTab: (tabId: string) => Promise<void>;
  openTab: (tabId: string) => Promise<void>;
  moveTab: (tabId: string, spaceId: string, folderId: string | null) => Promise<void>;

  // Settings Actions
  updateSettings: (updates: Partial<ExtensionSettings>) => Promise<void>;
}

async function sendMessage<T>(type: string, payload?: any): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (response?.success) {
        resolve(response.data);
      } else {
        reject(new Error(response?.error || 'Unknown error'));
      }
    });
  });
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  spaces: {},
  folders: {},
  tabs: {},
  settings: null,
  currentSpaceId: null,
  selectedTabId: null,
  searchQuery: '',
  isLoading: true,

  // Load all data from background
  loadData: async () => {
    try {
      set({ isLoading: true });
      const data = await sendMessage<ExtensionStorage>('GET_ALL_DATA');

      const spaceIds = Object.keys(data.spaces);
      const firstSpaceId = data.settings?.defaultSpaceId || (spaceIds.length > 0 ? spaceIds[0] : null);

      set({
        spaces: data.spaces,
        folders: data.folders,
        tabs: data.tabs,
        settings: data.settings,
        currentSpaceId: firstSpaceId,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      set({ isLoading: false });
    }
  },

  setCurrentSpace: (spaceId) => set({ currentSpaceId: spaceId }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Space Actions
  createSpace: async (spaceData) => {
    try {
      const space = await sendMessage<Space>('CREATE_SPACE', spaceData);
      set((state) => {
        const newSpaces = { ...state.spaces, [space.id]: space };
        const isFirstSpace = Object.keys(state.spaces).length === 0;
        return {
          spaces: newSpaces,
          // Auto-select the first created space
          currentSpaceId: isFirstSpace ? space.id : state.currentSpaceId,
        };
      });
      return space;
    } catch (error) {
      console.error('Failed to create space:', error);
      return null;
    }
  },

  updateSpace: async (spaceId, updates) => {
    try {
      await sendMessage('UPDATE_SPACE', { spaceId, updates });
      set((state) => ({
        spaces: {
          ...state.spaces,
          [spaceId]: { ...state.spaces[spaceId], ...updates },
        },
      }));
    } catch (error) {
      console.error('Failed to update space:', error);
    }
  },

  deleteSpace: async (spaceId) => {
    try {
      await sendMessage('DELETE_SPACE', { spaceId });
      set((state) => {
        const newSpaces = { ...state.spaces };
        delete newSpaces[spaceId];

        const newFolders = { ...state.folders };
        const newTabs = { ...state.tabs };

        // Remove related folders and tabs
        Object.values(state.folders)
          .filter((f) => f.spaceId === spaceId)
          .forEach((f) => delete newFolders[f.id]);

        Object.values(state.tabs)
          .filter((t) => t.spaceId === spaceId)
          .forEach((t) => delete newTabs[t.id]);

        const remainingSpaceIds = Object.keys(newSpaces);
        const newCurrentSpaceId =
          state.currentSpaceId === spaceId
            ? remainingSpaceIds.length > 0
              ? remainingSpaceIds[0]
              : null
            : state.currentSpaceId;

        return {
          spaces: newSpaces,
          folders: newFolders,
          tabs: newTabs,
          currentSpaceId: newCurrentSpaceId,
        };
      });
    } catch (error) {
      console.error('Failed to delete space:', error);
    }
  },

  // Folder Actions
  createFolder: async (folderData) => {
    try {
      const folder = await sendMessage<Folder>('CREATE_FOLDER', folderData);
      set((state) => ({
        folders: { ...state.folders, [folder.id]: folder },
      }));
      return folder;
    } catch (error) {
      console.error('Failed to create folder:', error);
      return null;
    }
  },

  updateFolder: async (folderId, updates) => {
    try {
      await sendMessage('UPDATE_FOLDER', { folderId, updates });
      set((state) => ({
        folders: {
          ...state.folders,
          [folderId]: { ...state.folders[folderId], ...updates },
        },
      }));
    } catch (error) {
      console.error('Failed to update folder:', error);
    }
  },

  deleteFolder: async (folderId) => {
    try {
      await sendMessage('DELETE_FOLDER', { folderId });
      set((state) => {
        const newFolders = { ...state.folders };
        const newTabs = { ...state.tabs };

        delete newFolders[folderId];

        // Remove tabs in this folder
        Object.values(state.tabs)
          .filter((t) => t.folderId === folderId)
          .forEach((t) => delete newTabs[t.id]);

        return { folders: newFolders, tabs: newTabs };
      });
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  },

  // Tab Actions
  createTab: async (tabData) => {
    try {
      const tab = await sendMessage<Tab>('CREATE_TAB', tabData);
      set((state) => ({
        tabs: { ...state.tabs, [tab.id]: tab },
      }));
      return tab;
    } catch (error) {
      console.error('Failed to create tab:', error);
      return null;
    }
  },

  updateTab: async (tabId, updates) => {
    try {
      await sendMessage('UPDATE_TAB', { tabId, updates });
      set((state) => ({
        tabs: {
          ...state.tabs,
          [tabId]: { ...state.tabs[tabId], ...updates },
        },
      }));
    } catch (error) {
      console.error('Failed to update tab:', error);
    }
  },

  deleteTab: async (tabId) => {
    try {
      await sendMessage('DELETE_TAB', { tabId });
      set((state) => {
        const newTabs = { ...state.tabs };
        delete newTabs[tabId];
        return { tabs: newTabs };
      });
    } catch (error) {
      console.error('Failed to delete tab:', error);
    }
  },

  openTab: async (tabId) => {
    try {
      await sendMessage('OPEN_TAB', { tabId });
    } catch (error) {
      console.error('Failed to open tab:', error);
    }
  },

  moveTab: async (tabId, spaceId, folderId) => {
    try {
      await sendMessage('UPDATE_TAB', { tabId, updates: { spaceId, folderId } });
      set((state) => ({
        tabs: {
          ...state.tabs,
          [tabId]: { ...state.tabs[tabId], spaceId, folderId },
        },
      }));
    } catch (error) {
      console.error('Failed to move tab:', error);
    }
  },

  // Settings Actions
  updateSettings: async (updates) => {
    try {
      await sendMessage('UPDATE_SETTINGS', updates);
      set((state) => ({
        settings: state.settings ? { ...state.settings, ...updates } : null,
      }));
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  },
}));

// Listen for updates from background
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'TABS_UPDATED') {
      useStore.getState().loadData();
    }
  });
}
