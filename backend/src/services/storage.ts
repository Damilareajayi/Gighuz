import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';

/**
 * Uploads a buffer to Firebase Storage under `${pathPrefix}/{uuid}.{extension}`
 * and returns a public URL. Requires FIREBASE_STORAGE_BUCKET (or the project's
 * default bucket) to be a real, existing bucket — throws otherwise.
 */
export async function uploadFile(
  pathPrefix: string,
  buffer: Buffer,
  contentType: string,
  extension: string
): Promise<string> {
  const bucket = getStorage().bucket(process.env.FIREBASE_STORAGE_BUCKET || undefined);
  const filename = `${pathPrefix}/${uuidv4()}.${extension}`;
  const file = bucket.file(filename);

  await file.save(buffer, {
    contentType,
    public: true,
    metadata: { cacheControl: 'public, max-age=31536000' },
  });

  return `https://storage.googleapis.com/${bucket.name}/${filename}`;
}

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

export function extensionForMimeType(mimeType: string): string | undefined {
  return EXT_BY_MIME[mimeType];
}
