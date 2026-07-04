export function scopedStorageKey(base: string, userId: string | null | undefined) {
  return userId ? `${base}:${userId}` : base;
}

export function readScopedJson<T>(base: string, userId: string | null | undefined, fallback: T): T {
  if (typeof window === 'undefined' || !userId) {
    return fallback;
  }

  const raw = window.localStorage.getItem(scopedStorageKey(base, userId));
  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeScopedJson(base: string, userId: string | null | undefined, value: unknown) {
  if (typeof window === 'undefined' || !userId) {
    return;
  }

  window.localStorage.setItem(scopedStorageKey(base, userId), JSON.stringify(value));
}

export function removeScopedItem(base: string, userId: string | null | undefined) {
  if (typeof window === 'undefined' || !userId) {
    return;
  }

  window.localStorage.removeItem(scopedStorageKey(base, userId));
}
