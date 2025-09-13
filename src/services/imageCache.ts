import AsyncStorage from '@react-native-async-storage/async-storage';

type ImgCacheEntry = { data: string; ts: number; };

const IMG_PREFIX = 'img:';
const IMG_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function imgKey(url: string) {
  return `${IMG_PREFIX}${url}`;
}

async function read(url: string): Promise<ImgCacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(imgKey(url));
    if (!raw) return null;
    const parsed: ImgCacheEntry = JSON.parse(raw);
    if (!parsed || typeof parsed.ts !== 'number' || typeof parsed.data !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

async function write(url: string, base64: string): Promise<void> {
  try {
    const entry: ImgCacheEntry = { data: base64, ts: Date.now() };
    await AsyncStorage.setItem(imgKey(url), JSON.stringify(entry));
  } catch {}
}

export async function getCachedImageDataUri(url: string): Promise<string | null> {
  const cached = await read(url);
  if (!cached) return null;
  const fresh = Date.now() - cached.ts <= IMG_TTL_MS;
  if (!fresh) return null;
  // Assume jpeg/png; Data URL still renders regardless of subtype
  return `data:image/*;base64,${cached.data}`;
}

export async function fetchAndCacheImageBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = (reader.result as string) || '';
        const idx = result.indexOf(',');
        resolve(idx >= 0 ? result.slice(idx + 1) : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    await write(url, base64);
    return `data:image/*;base64,${base64}`;
  } catch {
    return null;
  }
}

// Returns an Image `source` object and triggers background caching when needed
export async function getImageSourceForUrl(url: string): Promise<{ uri: string }> {
  const cached = await getCachedImageDataUri(url);
  if (cached) {
    return { uri: cached };
  }
  // Start caching in background; ignore result
  fetchAndCacheImageBase64(url).catch(() => {});
  return { uri: url };
}

// Optional helper to prefetch a list of URLs
export async function prefetchImages(urls: string[]): Promise<void> {
  await Promise.all(urls.map((u) => fetchAndCacheImageBase64(u).catch(() => null)));
}

