export interface Folder {
  id: string;
  spaceId: string;
  parentId: string | null;
  name: string;
  icon?: string;
  order: number;
  isExpanded: boolean;
  createdAt: number;
  updatedAt: number;
}
