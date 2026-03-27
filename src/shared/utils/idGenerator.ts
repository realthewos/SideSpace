export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function generateSpaceId(): string {
  return `space-${generateId()}`;
}

export function generateFolderId(): string {
  return `folder-${generateId()}`;
}

export function generateTabId(): string {
  return `tab-${generateId()}`;
}
