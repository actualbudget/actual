import type { JsonValue } from './transport';

export type HistoryBoundary = [Uint8Array, Uint8Array, Uint8Array];
function base64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}
function fromBase64(value: string, maxBytes: number): Uint8Array | null {
  if (
    !value ||
    value.length > 4 * Math.ceil(maxBytes / 3) ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      value,
    )
  ) {
    return null;
  }
  try {
    const decoded = Uint8Array.from(atob(value), character =>
      character.charCodeAt(0),
    );
    return decoded.byteLength <= maxBytes && base64(decoded) === value
      ? decoded
      : null;
  } catch {
    return null;
  }
}
export function encodeHistoryCursor(parts: HistoryBoundary): string {
  return base64(new TextEncoder().encode(JSON.stringify(parts.map(base64))));
}
export function decodeHistoryCursor(cursor: string): HistoryBoundary | null {
  if (typeof cursor !== 'string') return null;
  const outer = fromBase64(cursor, 1536);
  if (!outer) return null;
  try {
    const parsed: JsonValue = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(outer),
    );
    if (
      !Array.isArray(parsed) ||
      parsed.length !== 3 ||
      !parsed.every(value => typeof value === 'string')
    ) {
      return null;
    }
    const bounds = [16, 64, 256];
    const parts: Uint8Array[] = [];
    for (let n = 0; n < 3; n++) {
      const value = parsed[n];
      if (typeof value !== 'string') return null;
      const part = fromBase64(value, bounds[n]);
      if (!part || part.byteLength < 1 || part.includes(0)) return null;
      parts.push(part);
    }
    return [parts[0], parts[1], parts[2]];
  } catch {
    return null;
  }
}

/** Database BOM bytes are characters. Every displayed key must encode back exactly. */
export function decodeStoredText(bytes: Uint8Array): string | null {
  try {
    const text = new TextDecoder('utf-8', {
      fatal: true,
      ignoreBOM: true,
    }).decode(bytes);
    const encoded = new TextEncoder().encode(text);
    return encoded.byteLength === bytes.byteLength &&
      encoded.every((byte, n) => byte === bytes[n])
      ? text
      : null;
  } catch {
    return null;
  }
}
