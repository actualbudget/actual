import { describe, expect, it } from 'vitest';

import { getBudgetName, parseFile } from './ynab5';

function toBuffer(obj: unknown): Buffer {
  return Buffer.from(JSON.stringify(obj));
}

describe('ynab5 parseFile', () => {
  it('unwraps the legacy `budget` wrapper', () => {
    const data = parseFile(
      toBuffer({ data: { budget: { name: 'Legacy', accounts: [] } } }),
    );

    expect(data.name).toBe('Legacy');
    expect(getBudgetName('legacy.json', data)).toBe('Legacy');
  });

  it('unwraps the renamed `plan` wrapper from the current YNAB API', () => {
    const data = parseFile(
      toBuffer({ data: { plan: { name: 'Modern', accounts: [] } } }),
    );

    expect(data.name).toBe('Modern');
    expect(getBudgetName('modern.json', data)).toBe('Modern');
  });

  it('returns an already-unwrapped object unchanged', () => {
    const data = parseFile(toBuffer({ name: 'Bare', accounts: [] }));

    expect(data.name).toBe('Bare');
  });
});
