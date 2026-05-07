/** Decoded base64 payload cap for stored account/bank icons (matches client picker). */
export const MAX_BASE64_BYTES = 16 * 1024;

/** Stored icons are normalized to this square size (matches client picker). */
export const ICON_SIZE_PX = 64;

/** Max decoded bytes accepted before raster re-encode (mitigates decode bombs). */
export const MAX_ICON_INPUT_DECODE_BYTES = 256 * 1024;

/** Sharp `limitInputPixels` cap (4096 × 4096) for decode bomb mitigation. */
export const SHARP_DECODE_PIXEL_CAP = 16_777_216;
