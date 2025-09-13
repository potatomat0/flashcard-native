import * as SecureStore from 'expo-secure-store';
import api from './api';

type UploadArgs = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

export async function uploadImage({ uri, fileName, mimeType }: UploadArgs): Promise<string> {
  const baseURL = (api.defaults.baseURL || '').replace(/\/$/, '');
  const url = `${baseURL}/api/upload`;

  const form = new FormData();
  const type = (mimeType || guessMimeType(fileName || uri) || 'image/jpeg') as string;
  const name = normalizeFileName(fileName, type) || 'upload.jpg';

  form.append('image', { uri, name, type } as any);

  const headers: Record<string, string> = {};
  const token = await SecureStore.getItemAsync('flashcard_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { method: 'POST', headers, body: form as any });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = json?.message || `Upload failed (${res.status})`;
    throw new Error(message);
  }
  const filePath = json?.filePath as string | undefined;
  if (!filePath) throw new Error('Upload failed: no filePath returned');
  return filePath;
}

function normalizeFileName(name?: string | null, mime?: string | null): string {
  if (name && name.includes('.')) return name;
  const ext = (mime || '').split('/')[1] || 'jpg';
  return `upload.${ext}`;
}

function guessMimeType(name?: string | null): string | null {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.gif')) return 'image/gif';
  if (n.endsWith('.webp')) return 'image/webp';
  return null;
}

