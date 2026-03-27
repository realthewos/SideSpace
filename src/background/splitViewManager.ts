import { StorageManager } from './storageManager';
import type { Tab } from '../shared/types';

interface SplitViewPair {
  id: string;
  tabId1: string;
  tabId2: string;
  chromeTabId1?: number;
  chromeTabId2?: number;
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

      // Open first tab
      let chromeTab1: chrome.tabs.Tab | null = null;
      if (tab1.chromeTabId) {
        try {
          chromeTab1 = await chrome.tabs.get(tab1.chromeTabId);
          await chrome.tabs.update(tab1.chromeTabId, { active: true });
        } catch {
          chromeTab1 = await chrome.tabs.create({ url: tab1.url, active: true });
        }
      } else {
        chromeTab1 = await chrome.tabs.create({ url: tab1.url, active: true });
      }

      if (!chromeTab1 || !chromeTab1.id) {
        console.error('Failed to open first tab');
        return null;
      }

      // Inject split view UI into the first tab
      await this.injectSplitViewUI(chromeTab1.id, tab2.url, tab2.title || tab2.url);

      // Create split view record
      const splitViewId = `split-${Date.now()}`;
      const splitView: SplitViewPair = {
        id: splitViewId,
        tabId1,
        tabId2,
        chromeTabId1: chromeTab1.id,
        chromeTabId2: undefined,
        createdAt: Date.now(),
      };

      this.splitViews.set(splitViewId, splitView);
      this.tabToSplitView.set(tabId1, splitViewId);
      this.tabToSplitView.set(tabId2, splitViewId);

      // Update tab data
      await this.storageManager.updateTab(tabId1, { chromeTabId: chromeTab1.id, isOpen: true });

      return splitView;
    } catch (error) {
      console.error('Failed to create split view:', error);
      return null;
    }
  }

  private async injectSplitViewUI(tabId: number, secondUrl: string, secondTitle: string): Promise<void> {
    try {
      const tab = await chrome.tabs.get(tabId);

      // Cannot inject into chrome:// pages
      if (tab.url?.startsWith('chrome://') || tab.url?.startsWith('chrome-extension://')) {
        console.warn('Cannot inject split view into chrome pages');
        return;
      }

      // Inject the split view UI
      await chrome.scripting.executeScript({
        target: { tabId },
        func: this.createSplitViewUI,
        args: [secondUrl, secondTitle]
      });
    } catch (error) {
      console.error('Failed to inject split view UI:', error);
    }
  }

  // This function runs in the context of the web page
  private createSplitViewUI(url: string, title: string): void {
    // Check if split view already exists
    if (document.getElementById('sidespace-split-view-container')) {
      return;
    }

    // Create container
    const container = document.createElement('div');
    container.id = 'sidespace-split-view-container';
    container.innerHTML = `
      <style>
        #sidespace-split-view-container {
          position: fixed;
          top: 0;
          right: 0;
          width: 50%;
          height: 100vh;
          z-index: 2147483647;
          background: white;
          border-left: 1px solid #ccc;
          box-shadow: -2px 0 10px rgba(0,0,0,0.1);
        }
        #sidespace-split-view-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: #f5f5f5;
          border-bottom: 1px solid #ddd;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
        }
        #sidespace-split-view-title {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin: 0 10px;
        }
        #sidespace-split-view-close {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
        }
        #sidespace-split-view-close:hover {
          background: #e0e0e0;
        }
        #sidespace-split-view-iframe {
          width: 100%;
          height: calc(100vh - 40px);
          border: none;
        }
        #sidespace-split-view-resize {
          position: absolute;
          left: 0;
          top: 0;
          width: 5px;
          height: 100%;
          cursor: ew-resize;
          background: transparent;
        }
        #sidespace-split-view-resize:hover {
          background: #0066cc;
        }
      </style>
      <div id="sidespace-split-view-header">
        <span>📄</span>
        <span id="sidespace-split-view-title">${title}</span>
        <button id="sidespace-split-view-close" title="Close split view">×</button>
      </div>
      <iframe id="sidespace-split-view-iframe" src="${url}" sandbox="allow-same-origin allow-scripts allow-forms allow-popups"></iframe>
      <div id="sidespace-split-view-resize"></div>
    `;

    document.body.appendChild(container);

    // Handle close button
    const closeBtn = container.querySelector('#sidespace-split-view-close');
    closeBtn?.addEventListener('click', () => {
      container.remove();
    });

    // Handle resize
    const resizer = container.querySelector('#sidespace-split-view-resize') as HTMLElement;
    let isResizing = false;

    resizer?.addEventListener('mousedown', (e: MouseEvent) => {
      isResizing = true;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      const percentage = Math.max(20, Math.min(80, (newWidth / window.innerWidth) * 100));
      container.style.width = `${percentage}%`;
    });

    document.addEventListener('mouseup', () => {
      isResizing = false;
    });
  }

  async closeSplitView(splitViewId: string): Promise<void> {
    const splitView = this.splitViews.get(splitViewId);
    if (!splitView) return;

    // Remove split view UI from the tab
    if (splitView.chromeTabId1) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: splitView.chromeTabId1 },
          func: () => {
            const container = document.getElementById('sidespace-split-view-container');
            if (container) {
              container.remove();
            }
          }
        });
      } catch {
        // Tab might be closed
      }
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
