import {
  decodeHistoryCursor,
  decodeStoredText,
  encodeHistoryCursor,
} from './history-codec';
import type { HistoryBoundary } from './history-codec';

const bytes = (text: string) => new TextEncoder().encode(text);
const outer = (value: string[]) => btoa(JSON.stringify(value));

it.each([
  { id: bytes('ordinary') },
  { id: new Uint8Array(256).fill(255) },
  { id: bytes('\uFEFFa') },
  { id: bytes('😀'.repeat(64)) },
])(
  'preserves the exact boundary bytes independently of display decoding: %j',
  ({ id }) => {
    const boundary: HistoryBoundary = [
      bytes('EUR'),
      bytes('2026-02-28T00:00:00.000Z'),
      id,
    ];
    expect(decodeHistoryCursor(encodeHistoryCursor(boundary))).toEqual(
      boundary,
    );
  },
);

it.each([
  'abc',
  outer(['RVVS', 'eA==']),
  outer(['RVVS', 'eA==', 'YQ==', 'Yg==']),
  outer(['\ud800', 'eA==', 'YQ==']),
  outer(['RVVS', 'AA==', 'YQ==']),
  outer(['RVVS', 'eA==', btoa('x'.repeat(257))]),
  outer(['RVVS', 'eA==', '*bad*']),
  outer(['RVVS', 'eA==', 'YQ']),
  outer(['RVVS', 'eA==', '']),
  btoa(String.fromCharCode(255)),
])('rejects an invalid cursor: %j', cursor => {
  expect(decodeHistoryCursor(cursor)).toBeNull();
});

it('keeps a stored BOM as part of an id and distinguishes it from the plain id', () => {
  expect(decodeStoredText(bytes('a'))).toBe('a');
  expect(decodeStoredText(bytes('\uFEFFa'))).toBe('\uFEFFa');
  expect(decodeStoredText(bytes('\uFFFD'))).toBe('\uFFFD');
  expect(decodeStoredText(Uint8Array.of(255))).toBeNull();
  expect(decodeStoredText(Uint8Array.of(0xc3, 0x28))).toBeNull();
});
