import { describe, expect, it } from 'vitest';

import { normalizeRasterIconBufferForDb } from './normalizeStoredIcon';

/** 1×1 transparent PNG */
const ONE_BY_ONE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('normalizeRasterIconBufferForDb', () => {
  it('returns a PNG data URL within size limits', async () => {
    const dataUrl = await normalizeRasterIconBufferForDb(ONE_BY_ONE_PNG);
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    const b64 = dataUrl.split(',')[1] ?? '';
    const decoded = Buffer.from(b64, 'base64');
    expect(decoded.length).toBeGreaterThan(0);
    expect(decoded.length).toBeLessThanOrEqual(16 * 1024);
  });

  it('rejects empty buffer', async () => {
    await expect(
      normalizeRasterIconBufferForDb(Buffer.alloc(0)),
    ).rejects.toMatchObject({ reason: 'invalid-image-icon' });
  });

  it('rejects non-image bytes', async () => {
    await expect(
      normalizeRasterIconBufferForDb(
        Buffer.from('not an image at all', 'utf8'),
      ),
    ).rejects.toMatchObject({ reason: 'invalid-image-icon' });
  });
});
