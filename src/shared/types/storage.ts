import type { Space } from './space';
import type { Folder } from './folder';
import type { Tab } from './tab';
import type { ArcImportRecord } from './arc';

export interface ExtensionStorage {
  spaces: Record<string, Space>;
  folders: Record<string, Folder>;
  tabs: Record<string, Tab>;

  indexes: {
    spaceFolders: Record<string, string[]>;
    folderTabs: Record<string, string[]>;
    spaceTabs: Record<string, string[]>;
  };

  settings: ExtensionSettings;

  metadata: StorageMetadata;
}

export interface ExtensionSettings {
  defaultSpaceId: string | null;
  theme: 'light' | 'dark' | 'system';
  sidebarWidth: number;
  autoGroupTabs: boolean;
  showFavicons: boolean;
}

export interface StorageMetadata {
  lastSyncTime: number;
  version: string;
  arcImportHistory: ArcImportRecord[];
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  defaultSpaceId: null,
  theme: 'system',
  sidebarWidth: 280,
  autoGroupTabs: true,
  showFavicons: true,
};

export const DEFAULT_METADATA: StorageMetadata = {
  lastSyncTime: Date.now(),
  version: '1.0.0',
  arcImportHistory: [],
};
