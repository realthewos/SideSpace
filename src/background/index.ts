import { TabManager } from './tabManager';
import { StorageManager } from './storageManager';
import { MessageHandler } from './messageHandler';

const tabManager = new TabManager();
const storageManager = new StorageManager();
const messageHandler = new MessageHandler(tabManager, storageManager);

// Initialize extension
async function init() {
  console.log('SideSpace: Initializing...');

  // Set up side panel behavior
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  // Initialize storage with defaults if needed
  await storageManager.initializeStorage();

  console.log('SideSpace: Initialized successfully');
}

// Run initialization
init();

export { tabManager, storageManager, messageHandler };
