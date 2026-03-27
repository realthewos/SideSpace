import { StorageManager } from './storageManager';
import type { Tab } from '../shared/types';

interface SplitViewPair {
  id: string;
  tabId1: string;
  tabId2: string;
  chromeTabId1?: number;
  chromeTabId2?: number;
  windowId1?: number;
  windowId2?: number;
  createdAt: number;
}

export class SplitViewManager {
  private splitViews: Map<string, SplitViewPair> = new Map();
  private tabToSplitView: Map<string, string> = new Map();
  private storageManager: StorageManager;

  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;
  }

  async createSplitView(tabId1: string, tabId2: string): Promise<SplitViewPair | null> {
    try {
      // Get tab data directly from storage
      const data = await this.storageManager.getAllData();
      const tab1 = data.tabs[tabId1];
      const tab2 = data.tabs[tabId2];

      if (!tab1 || !tab2) {
        console.error('Tab data not found');
        return null;
      }

      // Get screen dimensions
      let screenWidth = 1920;
      let screenHeight = 1080;
      let leftOffset = 0;
      let topOffset = 0;

      try {
        const displays = await chrome.system.display.getInfo();
        const primaryDisplay = displays.find(d => d.isPrimary) || displays[0];

        if (primaryDisplay) {
          screenWidth = primaryDisplay.workArea.width;
          screenHeight = primaryDisplay.workArea.height;
          leftOffset = primaryDisplay.workArea.left;
          topOffset = primaryDisplay.workArea.top;
        }
      } catch (e) {
        console.warn('Could not get display info, using defaults');
      }

      // Calculate window dimensions for split view
      const halfWidth = Math.floor(screenWidth / 2);
      const windowWidth = halfWidth - 10;
      const windowHeight = screenHeight;

      // Open both tabs in separate windows side by side
      let chromeTab1: chrome.tabs.Tab | null = null;
      let chromeTab2: chrome.tabs.Tab | null = null;

      // Handle first tab
      if (tab1.chromeTabId) {
        chromeTab1 = await this.moveTabToNewWindow(
          tab1.chromeTabId,
          leftOffset,
          topOffset,
          windowWidth,
          windowHeight
        );
      } else {
        chromeTab1 = await this.createNewWindow(
          tab1.url,
          leftOffset,
          topOffset,
          windowWidth,
          windowHeight
        );
      }

      // Handle second tab
      if (tab2.chromeTabId) {
        chromeTab2 = await this.moveTabToNewWindow(
          tab2.chromeTabId,
          leftOffset + halfWidth,
          topOffset,
          windowWidth,
          windowHeight
        );
      } else {
        chromeTab2 = await this.createNewWindow(
          tab2.url,
          leftOffset + halfWidth,
          topOffset,
          windowWidth,
          windowHeight
        );
      }

      if (!chromeTab1 || !chromeTab2) {
        console.error('Failed to create split view windows');
        return null;
      }

      // Create split view record
      const splitViewId = `split-${Date.now()}`;
      const splitView: SplitViewPair = {
        id: splitViewId,
        tabId1,
        tabId2,
        chromeTabId1: chromeTab1.id,
        chromeTabId2: chromeTab2.id,
        windowId1: chromeTab1.windowId,
        windowId2: chromeTab2.windowId,
        createdAt: Date.now(),
      };

      this.splitViews.set(splitViewId, splitView);
      this.tabToSplitView.set(tabId1, splitViewId);
      this.tabToSplitView.set(tabId2, splitViewId);

      // Update tab data directly
      if (chromeTab1.id) {
        await this.storageManager.updateTab(tabId1, { chromeTabId: chromeTab1.id, isOpen: true });
      }
      if (chromeTab2.id) {
        await this.storageManager.updateTab(tabId2, { chromeTabId: chromeTab2.id, isOpen: true });
      }

      return splitView;
    } catch (error) {
      console.error('Failed to create split view:', error);
      return null;
    }
  }

  private async moveTabToNewWindow(
    tabId: number,
    left: number,
    top: number,
    width: number,
    height: number
  ): Promise<chrome.tabs.Tab | null> {
    try {
      const window = await chrome.windows.create({
        tabId,
        left,
        top,
        width,
        height,
        focused: true,
      });

      return window.tabs?.[0] || null;
    } catch (error) {
      console.error('Failed to move tab to new window:', error);
      return null;
    }
  }

  private async createNewWindow(
    url: string,
    left: number,
    top: number,
    width: number,
    height: number
  ): Promise<chrome.tabs.Tab | null> {
    try {
      const window = await chrome.windows.create({
        url,
        left,
        top,
        width,
        height,
        focused: true,
      });

      return window.tabs?.[0] || null;
    } catch (error) {
      console.error('Failed to create new window:', error);
      return null;
    }
  }

  async closeSplitView(splitViewId: string): Promise<void> {
    const splitView = this.splitViews.get(splitViewId);
    if (!splitView) return;

    try {
      if (splitView.windowId1) {
        await chrome.windows.remove(splitView.windowId1);
      }
      if (splitView.windowId2) {
        await chrome.windows.remove(splitView.windowId2);
      }
    } catch (error) {
      // Windows might already be closed
    }

    this.splitViews.delete(splitViewId);
    this.tabToSplitView.delete(splitView.tabId1);
    this.tabToSplitView.delete(splitView.tabId2);
  }

  getSplitViewForTab(tabId: string): SplitViewPair | undefined {
    const splitViewId = this.tabToSplitView.get(tabId);
    return splitViewId ? this.splitViews.get(splitViewId) : undefined;
  }

  isTabInSplitView(tabId: string): boolean {
    return this.tabToSplitView.has(tabId);
  }
}
