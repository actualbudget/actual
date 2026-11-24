import type { Template } from '#types/models/templates';

import { isTemplateExpired } from './templates';

describe('isTemplateExpired', () => {
  const by: Template = {
    type: 'by',
    amount: 100,
    month: '2026-10',
    directive: 'template',
    priority: 1,
  };

  it('expires a one-off `by` target after its month', () => {
    expect(isTemplateExpired(by, '2026-11')).toBe(true);
  });

  it('expires a one-off `spend` target after its month', () => {
    expect(
      isTemplateExpired(
        { ...by, type: 'spend', from: '2026-09' } satisfies Template,
        '2026-11',
      ),
    ).toBe(true);
  });

  it('keeps a target in or before its month', () => {
    expect(isTemplateExpired(by, '2026-10')).toBe(false);
    expect(isTemplateExpired(by, '2026-09')).toBe(false);
  });

  it('never expires a repeating target', () => {
    expect(isTemplateExpired({ ...by, repeat: 6 }, '2027-11')).toBe(false);
    expect(isTemplateExpired({ ...by, annual: true }, '2027-11')).toBe(false);
  });

  it('never expires other template types', () => {
    expect(
      isTemplateExpired(
        {
          type: 'periodic',
          amount: 100,
          period: { period: 'month', amount: 1 },
          starting: '2026-01-01',
          directive: 'template',
          priority: 1,
        },
        '2027-11',
      ),
    ).toBe(false);
  });
});
