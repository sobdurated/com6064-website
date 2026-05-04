export type SearchParamsLike = Record<string, string | string[] | undefined>;

export function getSearchValue(params: SearchParamsLike, key: string) {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? undefined;
  return value;
}

export function withSearchParams(
  path: string,
  params: SearchParamsLike,
  overrides: Record<string, string | number | undefined> = {},
) {
  const usp = new URLSearchParams();

  for (const [key, raw] of Object.entries(params)) {
    if (raw === undefined) continue;
    if (Array.isArray(raw)) {
      for (const item of raw) {
        if (item) usp.append(key, item);
      }
    } else if (raw) {
      usp.set(key, raw);
    }
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === "") {
      usp.delete(key);
    } else {
      usp.set(key, String(value));
    }
  }

  const query = usp.toString();
  return query ? `${path}?${query}` : path;
}
