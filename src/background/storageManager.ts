import type { Space, Folder, Tab, ExtensionStorage, ExtensionSettings, StorageMetadata } from '../shared/types';
import { DEFAULT_SETTINGS, DEFAULT_METADATA } from '../shared/types';
import { generateId, generateSpaceId, generateFolderId, generateTabId } from '../shared/utils/idGenerator';

export class StorageManager {
  private static STORAGE_KEY = 'sidespace_data';

  async initializeStorage(): Promise<void> {
    const existing = await this.getRawStorage();

    if (!existing) {
      const initialData: ExtensionStorage = {
        spaces: {},
        folders: {},
        tabs: {},
        indexes: {
          spaceFolders: {},
          folderTabs: {},
          spaceTabs: {},
        },
        settings: DEFAULT_SETTINGS,
        metadata: DEFAULT_METADATA,
      };

      await this.setRawStorage(initialData);
    }
  }

  private async getRawStorage(): Promise<ExtensionStorage | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(StorageManager.STORAGE_KEY, (result) => {
        resolve(result[StorageManager.STORAGE_KEY] || null);
      });
    });
  }

  private async setRawStorage(data: ExtensionStorage): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [StorageManager.STORAGE_KEY]: data }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  async getAllData(): Promise<ExtensionStorage> {
    const data = await this.getRawStorage();
    if (!data) {
      await this.initializeStorage();
      return this.getRawStorage() as Promise<ExtensionStorage>;
    }
    return data;
  }

  // Space operations
  async createSpace(spaceData: Partial<Space>): Promise<Space> {
    const data = await this.getAllData();
    const id = generateSpaceId();

    const space: Space = {
      id,
      name: spaceData.name || 'New Space',
      icon: spaceData.icon || '📁',
      color: spaceData.color,
      order: Object.keys(data.spaces).length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isArchived: false,
      source: spaceData.source || 'user',
      arcSpaceId: spaceData.arcSpaceId,
    };

    data.spaces[id] = space;
    data.indexes.spaceFolders[id] = [];
    data.indexes.spaceTabs[id] = [];

    await this.setRawStorage(data);
    return space;
  }

  async updateSpace(spaceId: string, updates: Partial<Space>): Promise<void> {
    const data = await this.getAllData();

    if (data.spaces[spaceId]) {
      data.spaces[spaceId] = {
        ...data.spaces[spaceId],
        ...updates,
        updatedAt: Date.now(),
      };
      await this.setRawStorage(data);
    }
  }

  async deleteSpace(spaceId: string): Promise<void> {
    const data = await this.getAllData();

    // Delete all tabs in this space
    for (const tabId of data.indexes.spaceTabs[spaceId] || []) {
      delete data.tabs[tabId];
    }

    // Delete all folders in this space
    for (const folderId of data.indexes.spaceFolders[spaceId] || []) {
      delete data.folders[folderId];
    }

    // Delete space
    delete data.spaces[spaceId];
    delete data.indexes.spaceFolders[spaceId];
    delete data.indexes.spaceTabs[spaceId];

    await this.setRawStorage(data);
  }

  // Folder operations
  async createFolder(folderData: Partial<Folder>): Promise<Folder> {
    const data = await this.getAllData();
    const id = generateFolderId();

    const folder: Folder = {
      id,
      spaceId: folderData.spaceId || '',
      parentId: folderData.parentId || null,
      name: folderData.name || 'New Folder',
      icon: folderData.icon,
      order: (data.indexes.spaceFolders[folderData.spaceId || ''] || []).length,
      isExpanded: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    data.folders[id] = folder;

    if (!data.indexes.spaceFolders[folder.spaceId]) {
      data.indexes.spaceFolders[folder.spaceId] = [];
    }
    data.indexes.spaceFolders[folder.spaceId].push(id);
    data.indexes.folderTabs[id] = [];

    await this.setRawStorage(data);
    return folder;
  }

  async updateFolder(folderId: string, updates: Partial<Folder>): Promise<void> {
    const data = await this.getAllData();

    if (data.folders[folderId]) {
      data.folders[folderId] = {
        ...data.folders[folderId],
        ...updates,
        updatedAt: Date.now(),
      };
      await this.setRawStorage(data);
    }
  }

  async deleteFolder(folderId: string): Promise<void> {
    const data = await this.getAllData();
    const folder = data.folders[folderId];

    if (folder) {
      // Delete all tabs in this folder
      for (const tabId of data.indexes.folderTabs[folderId] || []) {
        delete data.tabs[tabId];
      }

      // Remove from space index
      const spaceFolders = data.indexes.spaceFolders[folder.spaceId] || [];
      data.indexes.spaceFolders[folder.spaceId] = spaceFolders.filter(id => id !== folderId);

      delete data.folders[folderId];
      delete data.indexes.folderTabs[folderId];

      await this.setRawStorage(data);
    }
  }

  // Tab operations
  async createTab(tabData: Partial<Tab>): Promise<Tab> {
    const data = await this.getAllData();
    const id = generateTabId();

    const tab: Tab = {
      id,
      chromeTabId: tabData.chromeTabId,
      spaceId: tabData.spaceId || '',
      folderId: tabData.folderId || null,
      title: tabData.title || 'Untitled',
      originalTitle: tabData.originalTitle,
      url: tabData.url || '',
      favIconUrl: tabData.favIconUrl,
      order: tabData.folderId
        ? (data.indexes.folderTabs[tabData.folderId] || []).length
        : (data.indexes.spaceTabs[tabData.spaceId || ''] || []).length,
      isOpen: tabData.isOpen ?? false,
      isPinned: tabData.isPinned ?? false,
      customTitle: tabData.customTitle,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
      tags: tabData.tags,
    };

    data.tabs[id] = tab;

    // Update indexes
    if (tab.folderId) {
      if (!data.indexes.folderTabs[tab.folderId]) {
        data.indexes.folderTabs[tab.folderId] = [];
      }
      data.indexes.folderTabs[tab.folderId].push(id);
    } else {
      if (!data.indexes.spaceTabs[tab.spaceId]) {
        data.indexes.spaceTabs[tab.spaceId] = [];
      }
      data.indexes.spaceTabs[tab.spaceId].push(id);
    }

    await this.setRawStorage(data);
    return tab;
  }

  async updateTab(tabId: string, updates: Partial<Tab>): Promise<void> {
    const data = await this.getAllData();

    if (data.tabs[tabId]) {
      data.tabs[tabId] = {
        ...data.tabs[tabId],
        ...updates,
      };
      await this.setRawStorage(data);
    }
  }

  async deleteTab(tabId: string): Promise<void> {
    const data = await this.getAllData();
    const tab = data.tabs[tabId];

    if (tab) {
      // Remove from indexes
      if (tab.folderId) {
        const folderTabs = data.indexes.folderTabs[tab.folderId] || [];
        data.indexes.folderTabs[tab.folderId] = folderTabs.filter(id => id !== tabId);
      } else {
        const spaceTabs = data.indexes.spaceTabs[tab.spaceId] || [];
        data.indexes.spaceTabs[tab.spaceId] = spaceTabs.filter(id => id !== tabId);
      }

      delete data.tabs[tabId];
      await this.setRawStorage(data);
    }
  }

  // Settings operations
  async getSettings(): Promise<ExtensionSettings> {
    const data = await this.getAllData();
    return data.settings;
  }

  async updateSettings(updates: Partial<ExtensionSettings>): Promise<void> {
    const data = await this.getAllData();
    data.settings = { ...data.settings, ...updates };
    await this.setRawStorage(data);
  }
}
