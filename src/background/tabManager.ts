import { StorageManager } from './storageManager';
import type { Tab } from '../shared/types';

export class TabManager {
  private storageManager: StorageManager;

  constructor() {
    this.storageManager = new StorageManager();
    this.setupListeners();
  }

  private setupListeners(): void {
    // Listen for tab creation
    chrome.tabs.onCreated.addListener((chromeTab) => {
      this.handleTabCreated(chromeTab);
    });

    // Listen for tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, chromeTab) => {
      if (changeInfo.status === 'complete') {
        this.handleTabUpdated(chromeTab);
      }
    });

    // Listen for tab removal
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.handleTabRemoved(tabId);
    });

    // Listen for tab activation
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabActivated(activeInfo.tabId);
    });
  }

  private async handleTabCreated(chromeTab: chrome.tabs.Tab): Promise<void> {
    const settings = await this.storageManager.getSettings();

    if (settings.autoGroupTabs && settings.defaultSpaceId) {
      // Check if this tab is already tracked
      const data = await this.storageManager.getAllData();
      const existingTab = Object.values(data.tabs).find(
        (t) => t.chromeTabId === chromeTab.id
      );

      if (!existingTab && chromeTab.url) {
        // Add new tab to default space
        await this.storageManager.createTab({
          chromeTabId: chromeTab.id,
          spaceId: settings.defaultSpaceId,
          title: chromeTab.title || 'Untitled',
          url: chromeTab.url,
          favIconUrl: chromeTab.favIconUrl,
          isOpen: true,
        });

        // Notify sidepanel of update
        this.notifyTabsUpdated();
      }
    }
  }

  private async handleTabUpdated(chromeTab: chrome.tabs.Tab): Promise<void> {
    if (!chromeTab.id || !chromeTab.url) return;

    const data = await this.storageManager.getAllData();
    const existingTab = Object.values(data.tabs).find(
      (t) => t.chromeTabId === chromeTab.id
    );

    if (existingTab) {
      await this.storageManager.updateTab(existingTab.id, {
        title: chromeTab.title || existingTab.title,
        url: chromeTab.url,
        favIconUrl: chromeTab.favIconUrl || existingTab.favIconUrl,
        lastAccessed: Date.now(),
      });

      this.notifyTabsUpdated();
    }
  }

  private async handleTabRemoved(tabId: number): Promise<void> {
    const data = await this.storageManager.getAllData();
    const existingTab = Object.values(data.tabs).find(
      (t) => t.chromeTabId === tabId
    );

    if (existingTab) {
      await this.storageManager.updateTab(existingTab.id, {
        isOpen: false,
        chromeTabId: undefined,
      });

      this.notifyTabsUpdated();
    }
  }

  private async handleTabActivated(tabId: number): Promise<void> {
    const data = await this.storageManager.getAllData();
    const existingTab = Object.values(data.tabs).find(
      (t) => t.chromeTabId === tabId
    );

    if (existingTab) {
      await this.storageManager.updateTab(existingTab.id, {
        lastAccessed: Date.now(),
      });
    }
  }

  async openTab(tabId: string): Promise<void> {
    const data = await this.storageManager.getAllData();
    const tab = data.tabs[tabId];

    if (!tab) return;

    if (tab.chromeTabId) {
      // Tab already open, focus it
      try {
        await chrome.tabs.update(tab.chromeTabId, { active: true });
        const chromeTab = await chrome.tabs.get(tab.chromeTabId);
        if (chromeTab.windowId) {
          await chrome.windows.update(chromeTab.windowId, { focused: true });
        }
      } catch {
        // Tab may have been closed, create new one
        await this.createNewChromeTab(tab);
      }
    } else {
      await this.createNewChromeTab(tab);
    }
  }

  private async createNewChromeTab(tab: Tab): Promise<void> {
    const chromeTab = await chrome.tabs.create({
      url: tab.url,
      active: true,
    });

    if (chromeTab.id) {
      await this.storageManager.updateTab(tab.id, {
        chromeTabId: chromeTab.id,
        isOpen: true,
        lastAccessed: Date.now(),
      });

      this.notifyTabsUpdated();
    }
  }

  private notifyTabsUpdated(): void {
    chrome.runtime.sendMessage({ type: 'TABS_UPDATED' }).catch(() => {
      // Sidepanel may not be open, ignore error
    });
  }

  async syncChromeTabs(): Promise<void> {
    const chromeTabs = await chrome.tabs.query({});
    const data = await this.storageManager.getAllData();

    for (const chromeTab of chromeTabs) {
      if (!chromeTab.id || !chromeTab.url) continue;

      const existingTab = Object.values(data.tabs).find(
        (t) => t.chromeTabId === chromeTab.id
      );

      if (existingTab) {
        await this.storageManager.updateTab(existingTab.id, {
          title: chromeTab.title || existingTab.title,
          url: chromeTab.url,
          favIconUrl: chromeTab.favIconUrl || existingTab.favIconUrl,
          isOpen: true,
          lastAccessed: Date.now(),
        });
      }
    }
  }
}
