export interface Space {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  order: number;
  createdAt: number;
  updatedAt: number;
  isArchived: boolean;
  source: 'arc' | 'chrome' | 'user';
  arcSpaceId?: string;
}

export type SpaceSource = Space['source'];
