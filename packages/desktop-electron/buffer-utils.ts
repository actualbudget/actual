/**
 * Convert a Node Buffer into a Uint8Array that covers exactly the bytes of
 * the view. Buffers from Node's pool are views into a larger slab, so the
 * byteOffset/byteLength must be carried over; wrapping `buffer` alone would
 * include whatever else happens to share the slab.
 */
export function bufferToUint8Array(buffer: Buffer): Uint8Array {
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}
