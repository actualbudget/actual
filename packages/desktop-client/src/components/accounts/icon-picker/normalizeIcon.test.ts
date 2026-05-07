import { MAX_BASE64_BYTES } from '@actual-app/core/shared/accountIconLimits';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  emojiToDataUrl,
  IconNormalizationError,
  toDataUrl,
} from './normalizeIcon';

const originalCreateElement = document.createElement.bind(document);

function withMockedCanvas(toDataUrlOutput: string, runnable: () => void) {
  const ctx = {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fillText: vi.fn(),
    imageSmoothingEnabled: false,
    imageSmoothingQuality: 'low',
    font: '',
    textAlign: '',
    textBaseline: '',
  };

  const spy = vi.spyOn(document, 'createElement').mockImplementation(((
    name: string,
  ) => {
    if (name === 'canvas') {
      return {
        width: 0,
        height: 0,
        getContext: () => ctx,
        toDataURL: () => toDataUrlOutput,
      } as unknown as HTMLCanvasElement;
    }
    return originalCreateElement(name as 'div');
  }) as typeof document.createElement);

  try {
    runnable();
  } finally {
    spy.mockRestore();
  }
}

describe('toDataUrl', () => {
  it('builds a valid data URL', () => {
    expect(toDataUrl('image/png', 'AAAA')).toBe('data:image/png;base64,AAAA');
  });
});

describe('emojiToDataUrl', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects empty input', () => {
    expect(() => emojiToDataUrl('   ')).toThrow(IconNormalizationError);
  });

  it('returns the canvas-rendered data URL when within the size cap', () => {
    // Valid base64 so checkSize() can decode and enforce decoded-byte cap.
    withMockedCanvas('data:image/png;base64,AAAA', () => {
      expect(emojiToDataUrl('🏦')).toBe('data:image/png;base64,AAAA');
    });
  });

  it('throws when the rendered payload exceeds the size cap', () => {
    const quadCount = Math.ceil((MAX_BASE64_BYTES + 1) / 3);
    const oversized = 'data:image/png;base64,' + 'AAAA'.repeat(quadCount);
    withMockedCanvas(oversized, () => {
      expect(() => emojiToDataUrl('🏦')).toThrow(/too large/);
    });
  });
});
