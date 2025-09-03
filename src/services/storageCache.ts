import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

type CacheEntry<T> = {
  data: T;
  ts: number; // epoch ms
  v?: number; // optional version for future migrations
};

const PREFIX = 'cache:';

function stableStringify(obj: any): string {
  if (obj == null) return '';
  if (typeof obj !== 'object') return String(obj);
  const keys = Object.keys(obj).sort();
  const out: any = {};
  for (const k of keys) out[k] = obj[k];
  return JSON.stringify(out);
}

export function makeKey(path: string, params?: any) {
  const q = params ? `?${stableStringify(params)}` : '';
  return `${PREFIX}${path}${q}`;
}

async function readCache<T>(key: string): Promise<CacheEntry<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed: CacheEntry<T> = JSON.parse(raw);
    if (!parsed || typeof parsed.ts !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeCache<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now(), v: 1 };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore write failures
  }
}

export async function invalidateCache(key: string) {
  try { await AsyncStorage.removeItem(key); } catch {}
}

export async function cachedGet<T>(path: string, params?: any, ttlMs: number = 24 * 60 * 60 * 1000): Promise<T> {
  const key = makeKey(path, params);
  const cached = await readCache<T>(key);
  const now = Date.now();
  const isFresh = cached && now - cached.ts <= ttlMs;

  if (isFresh && cached) {
    return cached.data;
  }

  try {
    const { data } = await api.get<T>(path, { params });
    await writeCache<T>(key, data);
    return data;
  } catch (err) {
    // fallback to stale cache if available
    if (cached) return cached.data;
    throw err;
  }
}

// Helper for background revalidation if caller wants to update UI later
export async function cachedGetWithRevalidate<T>(
  path: string,
  params: any,
  ttlMs: number,
  onUpdate?: (data: T) => void
): Promise<T> {
  const key = makeKey(path, params);
  const cached = await readCache<T>(key);
  const now = Date.now();
  const isFresh = cached && now - cached.ts <= ttlMs;

  if (cached) {
    // fire-and-forget revalidate when stale
    if (!isFresh) {
      api
        .get<T>(path, { params })
        .then(async (res) => {
          await writeCache<T>(key, res.data);
          onUpdate?.(res.data);
        })
        .catch(() => {});
    }
    return cached.data;
  }

  const { data } = await api.get<T>(path, { params });
  await writeCache<T>(key, data);
  return data;
}

