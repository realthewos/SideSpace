import type { ArcExportData, ArcSpace, ArcContainer, ArcItem, ArcImportResult } from '../types/arc';
import { StorageManager } from '../../background/storageManager';

export class ArcParser {
  private storageManager: StorageManager;

  constructor(storageManager: StorageManager) {
    this.storageManager = storageManager;
  }

  async parseAndImport(rawData: any, fileName: string): Promise<ArcImportResult> {
    const result: ArcImportResult = {
      success: false,
      spacesImported: 0,
      tabsImported: 0,
      foldersImported: 0,
      errors: [],
    };

    try {
      // Detect and parse different formats
      let arcData: ArcExportData;

      if (this.isStorableSidebar(rawData)) {
        arcData = this.parseStorableSidebar(rawData);
      } else if (this.isChromiumBookmarks(rawData)) {
        arcData = this.parseChromiumBookmarks(rawData);
      } else if (typeof rawData === 'string' && rawData.includes('<!DOCTYPE')) {
        arcData = await this.parseHtmlBookmarks(rawData);
      } else {
        throw new Error('Unrecognized file format');
      }

      // Import the parsed data
      await this.importData(arcData, result);

      result.success = true;
    } catch (error: any) {
      result.errors.push(error.message);
    }

    return result;
  }

  private isStorableSidebar(data: any): boolean {
    return data && (data.spaces || data.sidebar || data.containers);
  }

  private isChromiumBookmarks(data: any): boolean {
    return data && data.roots && (data.roots.bookmark_bar || data.roots.other);
  }

  private parseStorableSidebar(data: any): ArcExportData {
    const spaces: ArcSpace[] = [];

    // Handle different Arc data structures
    const spaceList = data.spaces || data.sidebar?.spaces || [data];

    for (const spaceData of spaceList) {
      const space: ArcSpace = {
        id: spaceData.id || `arc-space-${Date.now()}`,
        title: spaceData.title || spaceData.name || 'Imported Space',
        icon: spaceData.emojiIcon || spaceData.icon || '📁',
        containers: this.extractContainers(spaceData),
      };
      spaces.push(space);
    }

    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      spaces,
    };
  }

  private extractContainers(spaceData: any): ArcContainer[] {
    const containers: ArcContainer[] = [];

    // Arc stores items in various structures
    const items = spaceData.items || spaceData.containers || spaceData.tabs || [];

    // Group items by container if available
    if (Array.isArray(items)) {
      if (items[0]?.container || items[0]?.parentId) {
        // Items have container references
        const containerMap = new Map<string, ArcItem[]>();

        for (const item of items) {
          const containerId = item.container || item.parentId || 'root';
          if (!containerMap.has(containerId)) {
            containerMap.set(containerId, []);
          }
          containerMap.get(containerId)!.push({
            id: item.id || `item-${Date.now()}-${Math.random()}`,
            title: item.title || item.name || 'Untitled',
            url: item.url || item.data?.url || '',
            favIconUrl: item.favIconUrl || item.favicon,
            savedAt: item.savedAt || item.createdAt,
          });
        }

        for (const [containerId, containerItems] of containerMap) {
          containers.push({
            id: containerId,
            title: containerId === 'root' ? 'Imported Tabs' : containerId,
            items: containerItems,
          });
        }
      } else {
        // Flat list of items
        containers.push({
          id: 'imported',
          title: 'Imported Tabs',
          items: items.map((item: any) => ({
            id: item.id || `item-${Date.now()}-${Math.random()}`,
            title: item.title || item.name || 'Untitled',
            url: item.url || item.data?.url || '',
            favIconUrl: item.favIconUrl || item.favicon,
            savedAt: item.savedAt || item.createdAt,
          })),
        });
      }
    }

    return containers;
  }

  private parseChromiumBookmarks(data: any): ArcExportData {
    const spaces: ArcSpace[] = [];

    const processFolder = (folder: any, spaceName: string): ArcContainer[] => {
      const containers: ArcContainer[] = [];

      const items: ArcItem[] = [];
      const childContainers: ArcContainer[] = [];

      for (const child of folder.children || []) {
        if (child.type === 'url') {
          items.push({
            id: child.id || `bm-${Date.now()}-${Math.random()}`,
            title: child.name || 'Untitled',
            url: child.url,
            savedAt: child.date_added,
          });
        } else if (child.type === 'folder') {
          childContainers.push(...processFolder(child, child.name));
        }
      }

      if (items.length > 0) {
        containers.push({
          id: folder.id || `folder-${Date.now()}`,
          title: folder.name || 'Bookmarks',
          items,
        });
      }

      containers.push(...childContainers);
      return containers;
    };

    // Create a space from bookmark bar
    if (data.roots.bookmark_bar) {
      spaces.push({
        id: 'imported-bookmarks',
        title: 'Imported Bookmarks',
        icon: '📚',
        containers: processFolder(data.roots.bookmark_bar, 'Bookmarks Bar'),
      });
    }

    // Create another space from other bookmarks if not empty
    if (data.roots.other?.children?.length > 0) {
      spaces.push({
        id: 'imported-other',
        title: 'Other Bookmarks',
        icon: '📁',
        containers: processFolder(data.roots.other, 'Other Bookmarks'),
      });
    }

    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      spaces,
    };
  }

  private async parseHtmlBookmarks(html: string): Promise<ArcExportData> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const containers: ArcContainer[] = [];
    const items: ArcItem[] = [];

    // Parse all links
    const links = doc.querySelectorAll('a');
    links.forEach((link, index) => {
      items.push({
        id: `html-${Date.now()}-${index}`,
        title: link.textContent || 'Untitled',
        url: link.getAttribute('href') || '',
      });
    });

    if (items.length > 0) {
      containers.push({
        id: 'imported-html',
        title: 'Imported from HTML',
        items,
      });
    }

    return {
      version: '1.0',
      exportDate: new Date().toISOString(),
      spaces: [{
        id: 'imported-html-space',
        title: 'Imported Bookmarks',
        icon: '🌐',
        containers,
      }],
    };
  }

  private async importData(data: ArcExportData, result: ArcImportResult): Promise<void> {
    for (const arcSpace of data.spaces) {
      try {
        // Create space
        const space = await this.storageManager.createSpace({
          name: arcSpace.title,
          icon: arcSpace.icon,
          source: 'arc',
          arcSpaceId: arcSpace.id,
        });

        result.spacesImported++;

        // Import containers as folders
        for (const container of arcSpace.containers) {
          await this.importContainer(space.id, container, null, result);
        }
      } catch (error: any) {
        result.errors.push(`Space "${arcSpace.title}": ${error.message}`);
      }
    }
  }

  private async importContainer(
    spaceId: string,
    container: ArcContainer,
    parentFolderId: string | null,
    result: ArcImportResult
  ): Promise<void> {
    // Create folder for this container
    const folder = await this.storageManager.createFolder({
      spaceId,
      parentId: parentFolderId,
      name: container.title,
    });

    result.foldersImported++;

    // Import items as tabs
    for (const item of container.items) {
      if (item.url) {
        await this.storageManager.createTab({
          spaceId,
          folderId: folder.id,
          title: item.title,
          url: item.url,
          favIconUrl: item.favIconUrl,
          isOpen: false,
        });
        result.tabsImported++;
      }
    }

    // Handle nested containers
    if (container.children) {
      for (const child of container.children) {
        await this.importContainer(spaceId, child, folder.id, result);
      }
    }
  }
}
