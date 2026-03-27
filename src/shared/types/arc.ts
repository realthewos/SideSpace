export interface ArcExportData {
  version: string;
  exportDate: string;
  spaces: ArcSpace[];
  bookmarks?: ArcBookmark[];
}

export interface ArcSpace {
  id: string;
  title: string;
  icon?: string;
  containers: ArcContainer[];
}

export interface ArcContainer {
  id: string;
  title: string;
  parentId?: string;
  order?: number;
  items: ArcItem[];
  children?: ArcContainer[];
}

export interface ArcItem {
  id: string;
  title: string;
  url: string;
  favIconUrl?: string;
  savedAt?: number;
}

export interface ArcBookmark {
  id: string;
  title: string;
  url: string;
  date_added?: number;
}

export interface ArcImportResult {
  success: boolean;
  spacesImported: number;
  tabsImported: number;
  foldersImported: number;
  errors: string[];
}

export interface ArcImportRecord {
  importId: string;
  importDate: number;
  fileName: string;
  spacesImported: number;
  tabsImported: number;
}
