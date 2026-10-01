export const normalizeId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const id = value.trim();
  return /^[a-z0-9]{1,12}$/i.test(id) ? id : null;
};

export const normalizeIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.map(normalizeId).filter((id): id is string => id !== null),
    ),
  ];
};

const decodeId = (str: string): string | null => {
  try {
    return normalizeId(decodeURIComponent(str));
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
  const normalizedIds = normalizeIds(ids);
  return `/${normalizedIds.map(encodeURIComponent).join('/')}`;
};
