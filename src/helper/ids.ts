const decodeId = (str: string): string | null => {
  try {
    const id = decodeURIComponent(str).trim();
    return id || null;
  } catch {
    return null;
  }
};

export const parseIds = (pathname: string): string[] => {
  const ids = pathname
    .split('/')
    .slice(1)
    .map(decodeId)
    .filter((id): id is string => id !== null);
  return [...new Set(ids)];
};

export const makeIdsPath = (ids: string[]): string => {
  return ids.length === 0 ? '/' : `/${ids.map(encodeURIComponent).join('/')}`;
};
