import { api } from './api';

export interface UploadedFile { id: string; mime: string; size: number }

/** Photos are shrunk before upload (long side ≤ 1600 px, JPEG): a phone photo is 3–8 MB, a document needs ~300 KB (ARCHITECTURE §3.6). */
export async function shrinkImage(file: File, maxSide = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    if (k === 1 && file.size < 600_000) { bmp.close(); return file; }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * k);
    canvas.height = Math.round(bmp.height * k);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file; // an unreadable image is left to the server's checks
  }
}

/** POST /files (multipart). Resolves with the stored file's id. */
export async function uploadFile(file: File): Promise<UploadedFile> {
  const body = new FormData();
  body.append('file', await shrinkImage(file));
  return api<UploadedFile>('/files', { method: 'POST', body });
}
