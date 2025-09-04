export type CloudinaryTransform = {
  w?: number;
  h?: number;
  q?: 'auto' | number;
  f?: 'auto' | 'jpg' | 'png' | 'webp' | string;
  c?: 'fill' | 'fit' | 'scale' | 'thumb' | string;
};

// Backend default image for cards when URL is empty/undefined
export const DEFAULT_CARD_IMAGE_URL = 'https://res.cloudinary.com/dobaislqr/image/upload/v1755423363/My%20Brand/UIT-Logo_dfkwli.png';

export function transformCloudinary(url?: string, opts: CloudinaryTransform = {}): string | undefined {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (!u.hostname.includes('res.cloudinary.com')) return url;
    const parts = u.pathname.split('/');
    const uploadIndex = parts.findIndex((p) => p === 'upload');
    if (uploadIndex === -1) return url;
    const params: string[] = [];
    if (opts.w) params.push(`w_${opts.w}`);
    if (opts.h) params.push(`h_${opts.h}`);
    if (opts.c) params.push(`c_${opts.c}`);
    if (opts.q) params.push(`q_${opts.q}`);
    if (opts.f) params.push(`f_${opts.f}`);
    const insert = params.join(',');
    // Insert or replace transform segment right after 'upload'
    const nextIndex = uploadIndex + 1;
    // If there is already a transform segment (contains comma or starts with something like c_ or w_), we replace it
    if (parts[nextIndex] && /([whqfc]_\w+|,)/.test(parts[nextIndex])) {
      parts[nextIndex] = insert;
    } else {
      parts.splice(nextIndex, 0, insert);
    }
    u.pathname = parts.join('/');
    return u.toString();
  } catch {
    return url;
  }
}
