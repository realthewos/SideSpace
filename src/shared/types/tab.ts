export interface Tab {
  id: string;
  chromeTabId?: number;
  spaceId: string;
  folderId: string | null;
  title: string;
  originalTitle?: string;
  url: string;
  favIconUrl?: string;
  order: number;
  isOpen: boolean;
  isPinned: boolean;
  customTitle?: string;
  createdAt: number;
  lastAccessed: number;
  tags?: string[];
}
