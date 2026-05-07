import type * as SharpNS from 'sharp';

import { PostError } from '#server/errors';
import {
  ICON_SIZE_PX,
  MAX_BASE64_BYTES,
  MAX_ICON_INPUT_DECODE_BYTES,
  SHARP_DECODE_PIXEL_CAP,
} from '#shared/accountIconLimits';

type SharpFactory = (
  input?: Buffer,
  options?: SharpNS.SharpOptions,
) => SharpNS.Sharp;

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

function sharpFactoryFromImport(mod: unknown): SharpFactory | undefined {
  if (typeof mod === 'function') {
    return mod as SharpFactory;
  }
  if (typeof mod === 'object' && mod !== null) {
    const d = Reflect.get(mod, 'default');
    if (typeof d === 'function') {
      return d as SharpFactory;
    }
  }
  return undefined;
}

/**
 * Decode and re-encode a raster icon for safe storage: validates image bytes
 * with sharp when available, normalizes to {@link ICON_SIZE_PX} PNG, and
 * enforces {@link MAX_BASE64_BYTES} on the decoded output payload.
 */
export async function normalizeRasterIconBufferForDb(
  input: Buffer,
): Promise<string> {
  if (input.byteLength === 0) {
    throw new PostError('invalid-image-icon');
  }
  if (input.byteLength > MAX_ICON_INPUT_DECODE_BYTES) {
    throw new PostError('icon-too-large');
  }

  let sharpFactory: SharpFactory | undefined;
  try {
    sharpFactory = sharpFactoryFromImport(await import('sharp'));
  } catch {
    sharpFactory = undefined;
  }

  if (sharpFactory) {
    try {
      const out = await sharpFactory(input, {
        limitInputPixels: SHARP_DECODE_PIXEL_CAP,
        sequentialRead: true,
        animated: false,
      })
        .rotate()
        .resize(ICON_SIZE_PX, ICON_SIZE_PX, {
          fit: 'cover',
          position: 'center',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();
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
