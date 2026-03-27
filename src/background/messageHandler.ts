import { TabManager } from './tabManager';
import { StorageManager } from './storageManager';
import { ArcImporter } from './arcImporter';
import { SplitViewManager } from './splitViewManager';
import type { ArcImportResult } from '../shared/types/arc';

export interface Message {
  type: string;
  payload?: any;
}

export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export class MessageHandler {
  private tabManager: TabManager;
  private storageManager: StorageManager;
  private arcImporter: ArcImporter;
  private splitViewManager: SplitViewManager;

  constructor(tabManager: TabManager, storageManager: StorageManager) {
    this.tabManager = tabManager;
    this.storageManager = storageManager;
    this.arcImporter = new ArcImporter(storageManager);
    this.splitViewManager = new SplitViewManager(storageManager);
    this.setupListener();
  }

  private setupListener(): void {
    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
      this.handleMessage(message)
        .then((response) => sendResponse(response))
        .catch((error) => sendResponse({ success: false, error: error.message }));

      return true; // Keep message channel open for async response
    });
  }

  private async handleMessage(message: Message): Promise<MessageResponse> {
    try {
      switch (message.type) {
        case 'GET_ALL_DATA':
          return this.handleGetAllData();

        case 'OPEN_TAB':
          return this.handleOpenTab(message.payload);

        case 'CREATE_SPACE':
          return this.handleCreateSpace(message.payload);

        case 'UPDATE_SPACE':
          return this.handleUpdateSpace(message.payload);

        case 'DELETE_SPACE':
          return this.handleDeleteSpace(message.payload);

        case 'CREATE_FOLDER':
          return this.handleCreateFolder(message.payload);

        case 'UPDATE_FOLDER':
          return this.handleUpdateFolder(message.payload);

        case 'DELETE_FOLDER':
          return this.handleDeleteFolder(message.payload);

        case 'CREATE_TAB':
          return this.handleCreateTab(message.payload);

        case 'UPDATE_TAB':
          return this.handleUpdateTab(message.payload);

        case 'DELETE_TAB':
          return this.handleDeleteTab(message.payload);

        case 'UPDATE_SETTINGS':
          return this.handleUpdateSettings(message.payload);

        case 'SYNC_TABS':
          return this.handleSyncTabs();

        case 'IMPORT_ARC_DATA':
          return this.handleImportArcData(message.payload);

        case 'GET_TAB_DATA':
          return this.handleGetTabData(message.payload);

        case 'CREATE_SPLIT_VIEW':
          return this.handleCreateSplitView(message.payload);

        case 'CLOSE_SPLIT_VIEW':
          return this.handleCloseSplitView(message.payload);

        default:
          return { success: false, error: `Unknown message type: ${message.type}` };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async handleGetAllData(): Promise<MessageResponse> {
    const data = await this.storageManager.getAllData();
    return { success: true, data };
  }

  private async handleOpenTab(payload: { tabId: string }): Promise<MessageResponse> {
    await this.tabManager.openTab(payload.tabId);
    return { success: true };
  }

  private async handleCreateSpace(payload: any): Promise<MessageResponse> {
    const space = await this.storageManager.createSpace(payload);
    return { success: true, data: space };
  }

  private async handleUpdateSpace(payload: { spaceId: string; updates: any }): Promise<MessageResponse> {
    await this.storageManager.updateSpace(payload.spaceId, payload.updates);
    return { success: true };
  }

  private async handleDeleteSpace(payload: { spaceId: string }): Promise<MessageResponse> {
    await this.storageManager.deleteSpace(payload.spaceId);
    return { success: true };
  }

  private async handleCreateFolder(payload: any): Promise<MessageResponse> {
    const folder = await this.storageManager.createFolder(payload);
    return { success: true, data: folder };
  }

  private async handleUpdateFolder(payload: { folderId: string; updates: any }): Promise<MessageResponse> {
    await this.storageManager.updateFolder(payload.folderId, payload.updates);
    return { success: true };
  }

  private async handleDeleteFolder(payload: { folderId: string }): Promise<MessageResponse> {
    await this.storageManager.deleteFolder(payload.folderId);
    return { success: true };
  }

  private async handleCreateTab(payload: any): Promise<MessageResponse> {
    const tab = await this.storageManager.createTab(payload);
    return { success: true, data: tab };
  }

  private async handleUpdateTab(payload: { tabId: string; updates: any }): Promise<MessageResponse> {
    await this.storageManager.updateTab(payload.tabId, payload.updates);
    return { success: true };
  }

  private async handleDeleteTab(payload: { tabId: string }): Promise<MessageResponse> {
    await this.storageManager.deleteTab(payload.tabId);
    return { success: true };
  }

  private async handleUpdateSettings(payload: any): Promise<MessageResponse> {
    await this.storageManager.updateSettings(payload);
    return { success: true };
  }

  private async handleSyncTabs(): Promise<MessageResponse> {
    await this.tabManager.syncChromeTabs();
    return { success: true };
  }

  private async handleImportArcData(payload: { data: any; fileName: string }): Promise<MessageResponse<ArcImportResult>> {
    const result = await this.arcImporter.importFromRawData(payload.data);
    return { success: result.success, data: result };
  }

  private async handleGetTabData(payload: { tabId: string }): Promise<MessageResponse> {
    const data = await this.storageManager.getAllData();
    const tab = data.tabs[payload.tabId];
    if (tab) {
      return { success: true, data: tab };
    }
    return { success: false, error: 'Tab not found' };
  }

  private async handleCreateSplitView(payload: { tabId1: string; tabId2: string }): Promise<MessageResponse> {
    const result = await this.splitViewManager.createSplitView(payload.tabId1, payload.tabId2);
    if (result) {
      return { success: true, data: result };
    }
    return { success: false, error: 'Failed to create split view' };
  }

  private async handleCloseSplitView(payload: { splitViewId: string }): Promise<MessageResponse> {
    await this.splitViewManager.closeSplitView(payload.splitViewId);
    return { success: true };
  }
}
