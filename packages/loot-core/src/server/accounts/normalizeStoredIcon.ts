import type * as PhotonNS from '@silvia-odwyer/photon-node';

import { PostError } from '#server/errors';
import {
  ICON_SIZE_PX,
  MAX_BASE64_BYTES,
  MAX_ICON_INPUT_DECODE_BYTES,
} from '#shared/accountIconLimits';

function parseImageDataUrlToBuffer(dataUrl: string): Buffer {
  const trimmed = dataUrl.trim();
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s.exec(trimmed);
  if (!match?.[2]) {
    throw new PostError('invalid-image-icon');
  }
  const b64 = match[2].replace(/\s/g, '');
  const buf = Buffer.from(b64, 'base64');
  if (buf.byteLength === 0) {
    throw new PostError('invalid-image-icon');
  }
  if (buf.byteLength > MAX_ICON_INPUT_DECODE_BYTES) {
    throw new PostError('icon-too-large');
  }
  return buf;
}

function detectRasterMime(buf: Buffer): string | null {
  if (buf.length < 12) {
    return null;
  }
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  ) {
    return 'image/png';
  }
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'image/jpeg';
  }
  const sig6 = buf.toString('ascii', 0, 6);
  if (sig6 === 'GIF87a' || sig6 === 'GIF89a') {
    return 'image/gif';
  }
  if (
    buf.toString('ascii', 0, 4) === 'RIFF' &&
    buf.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  // ICO: reserved 0, type 1 (icon)
  if (
    buf.readUInt16LE(0) === 0 &&
    buf.readUInt16LE(2) === 1 &&
    buf.readUInt16LE(4) > 0
  ) {
    return 'image/x-icon';
  }
  return null;
}

export async function normalizeRasterIconBufferForDb(
  input: Buffer,
): Promise<string> {
  if (input.byteLength === 0) {
    throw new PostError('invalid-image-icon');
  }
  if (input.byteLength > MAX_ICON_INPUT_DECODE_BYTES) {
    throw new PostError('icon-too-large');
  }

  let photon: typeof PhotonNS | undefined;
  try {
    photon = (await import('@silvia-odwyer/photon-node')) as typeof PhotonNS;
  } catch {
    photon = undefined;
  }

  if (photon) {
    try {
      const img = photon.PhotonImage.new_from_byteslice(new Uint8Array(input));

      const srcW = img.get_width();
      const srcH = img.get_height();
      const scale = Math.max(ICON_SIZE_PX / srcW, ICON_SIZE_PX / srcH);
      const scaledW = Math.round(srcW * scale);
      const scaledH = Math.round(srcH * scale);

      const resized = photon.resize(img, scaledW, scaledH, 5); // 5 = Lanczos3
      img.free();

      const x1 = Math.floor((scaledW - ICON_SIZE_PX) / 2);
      const y1 = Math.floor((scaledH - ICON_SIZE_PX) / 2);
      const cropped = photon.crop(
        resized,
        x1,
        y1,
        x1 + ICON_SIZE_PX,
        y1 + ICON_SIZE_PX,
      );
      resized.free();

      const out = Buffer.from(cropped.get_bytes());
      cropped.free();

      if (out.byteLength > MAX_BASE64_BYTES) {
        throw new PostError('icon-too-large');
      }
      return `data:image/png;base64,${out.toString('base64')}`;
    } catch (err) {
      if (err instanceof PostError) {
        throw err;
      }
      throw new PostError('invalid-image-icon');
    }
  }

  const mime = detectRasterMime(input);
  if (mime === null) {
    throw new PostError('invalid-image-icon');
  }
  if (input.byteLength > MAX_BASE64_BYTES) {
    throw new PostError('icon-too-large');
  }
  return `data:${mime};base64,${input.toString('base64')}`;
}

/**
 * When `dataUrl` is a base64 data URL for an image/* type, normalize it for DB
 * storage. Other strings are returned unchanged (legacy non-data values).
 */
export async function normalizeIconDataUrlForDbIfRaster(
  dataUrl: string,
): Promise<string> {
  const trimmed = dataUrl.trim();
  if (!trimmed.startsWith('data:image/')) {
    return dataUrl;
  }
  const buf = parseImageDataUrlToBuffer(trimmed);
  return normalizeRasterIconBufferForDb(buf);
}
