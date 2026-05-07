import {
  ICON_SIZE_PX,
  MAX_BASE64_BYTES,
} from '@actual-app/core/shared/accountIconLimits';

export class IconNormalizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IconNormalizationError';
  }
}

function checkSize(dataUrl: string): string {
  const base64 = dataUrl.split(',')[1] ?? '';
  let decodedLength: number;
  try {
    decodedLength = Uint8Array.from(atob(base64.replace(/\s/g, '')), c =>
      c.charCodeAt(0),
    ).byteLength;
  } catch {
    throw new IconNormalizationError('Invalid base64 in data URL');
  }
  if (decodedLength > MAX_BASE64_BYTES) {
    throw new IconNormalizationError(
      `Icon is too large after normalization (${decodedLength} bytes > ${MAX_BASE64_BYTES} bytes)`,
    );
  }
  return dataUrl;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new IconNormalizationError('Failed to decode image'));
    img.src = src;
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new IconNormalizationError('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

function paintToCanvas(paint: (ctx: CanvasRenderingContext2D) => void): string {
  const canvas = document.createElement('canvas');
  canvas.width = ICON_SIZE_PX;
  canvas.height = ICON_SIZE_PX;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new IconNormalizationError('Canvas context unavailable');
  }
  ctx.clearRect(0, 0, ICON_SIZE_PX, ICON_SIZE_PX);
  paint(ctx);
  return canvas.toDataURL('image/png');
}

/**
 * Decode an image (Blob, File, data URL or remote URL) and re-encode it as a
 * 64x64 PNG data URL.
 *
 * Throws `IconNormalizationError` if decoding fails or the resulting base64
 * payload exceeds {@link MAX_BASE64_BYTES}.
 */
export async function normalizeImageToDataUrl(
  source: Blob | string,
): Promise<string> {
  const initial =
    typeof source === 'string' ? source : await blobToDataUrl(source);
  const img = await loadImage(initial);

  const dataUrl = paintToCanvas(ctx => {
    // Fit the image into the square while preserving its aspect ratio.
    const ratio = Math.min(
      ICON_SIZE_PX / img.naturalWidth,
      ICON_SIZE_PX / img.naturalHeight,
    );
    const w = Math.max(1, Math.round(img.naturalWidth * ratio));
    const h = Math.max(1, Math.round(img.naturalHeight * ratio));
    const x = Math.floor((ICON_SIZE_PX - w) / 2);
    const y = Math.floor((ICON_SIZE_PX - h) / 2);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, x, y, w, h);
  });

  return checkSize(dataUrl);
}

/**
 * Render an emoji glyph into a 64x64 PNG data URL so that storage and
 * rendering of all icon types is uniform.
 */
export function emojiToDataUrl(emoji: string): string {
  const trimmed = emoji.trim();
  if (!trimmed) {
    throw new IconNormalizationError('Empty emoji');
  }
  const dataUrl = paintToCanvas(ctx => {
    ctx.font = `${ICON_SIZE_PX - 8}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(trimmed, ICON_SIZE_PX / 2, ICON_SIZE_PX / 2 + 2);
  });
  return checkSize(dataUrl);
}

/** Convert a {contentType, base64} response from the backend into a data URL. */
export function toDataUrl(contentType: string, base64: string): string {
  return `data:${contentType};base64,${base64}`;
}
