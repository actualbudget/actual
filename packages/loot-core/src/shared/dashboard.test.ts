import {
  DEFAULT_DASHBOARD_STATE,
  findDuplicateWidget,
  isSameWidgetContent,
  normalizeWidgetMeta,
} from './dashboard';

describe('normalizeWidgetMeta', () => {
  it('treats null, empty and cosmetic-only metadata the same', () => {
    expect(normalizeWidgetMeta('net-worth-card', null)).toEqual({});
    expect(normalizeWidgetMeta('net-worth-card', {})).toEqual({});
    expect(normalizeWidgetMeta('net-worth-card', { name: 'Wealth' })).toEqual(
      {},
    );
  });

  it('drops empty conditions and the default conditions operator', () => {
    expect(
      normalizeWidgetMeta('cash-flow-card', {
        conditions: [],
        conditionsOp: 'and',
      }),
    ).toEqual({});
    expect(
      normalizeWidgetMeta('cash-flow-card', {
        conditions: [{ field: 'account', op: 'is', value: 'a' }],
        conditionsOp: 'or',
      }),
    ).toEqual({
      conditions: [{ field: 'account', op: 'is', value: 'a' }],
      conditionsOp: 'or',
    });
  });

  it('drops settings that spell out the widget defaults', () => {
    expect(
      normalizeWidgetMeta('spending-card', { mode: 'single-month' }),
    ).toEqual({});
    expect(normalizeWidgetMeta('spending-card', { mode: 'budget' })).toEqual({
      mode: 'budget',
    });
  });
});

describe('isSameWidgetContent', () => {
  it('requires the same widget type', () => {
    expect(
      isSameWidgetContent(
        { type: 'net-worth-card', meta: null },
        { type: 'cash-flow-card', meta: null },
      ),
    ).toBe(false);
  });

  it('ignores the name, key order and explicit defaults', () => {
    expect(
      isSameWidgetContent(
        {
          type: 'spending-card',
          meta: { name: 'This Month', mode: 'single-month' },
        },
        { type: 'spending-card', meta: null },
      ),
    ).toBe(true);
    expect(
      isSameWidgetContent(
        {
          type: 'summary-card',
          meta: {
            content: '{"type":"sum"}',
            timeFrame: {
              start: '2024-01-01',
              end: '2024-12-31',
              mode: 'yearToDate',
            },
          },
        },
        {
          type: 'summary-card',
          meta: {
            timeFrame: {
              mode: 'yearToDate',
              end: '2024-12-31',
              start: '2024-01-01',
            },
            content: '{"type":"sum"}',
            name: 'Other name',
          },
        },
      ),
    ).toBe(true);
  });

  it('detects different settings', () => {
    expect(
      isSameWidgetContent(
        { type: 'spending-card', meta: { mode: 'budget' } },
        { type: 'spending-card', meta: { mode: 'average' } },
      ),
    ).toBe(false);
    expect(
      isSameWidgetContent(
        { type: 'custom-report', meta: { id: 'a' } },
        { type: 'custom-report', meta: { id: 'b' } },
      ),
    ).toBe(false);
    expect(
      isSameWidgetContent(
        { type: 'markdown-card', meta: { content: 'Hello' } },
        { type: 'markdown-card', meta: { content: 'Hello world' } },
      ),
    ).toBe(false);
  });
});

describe('findDuplicateWidget', () => {
  it('finds an equivalent widget among existing ones', () => {
    const existing = [
      { id: '1', type: 'net-worth-card' as const, meta: null },
      { id: '2', type: 'spending-card' as const, meta: { mode: 'budget' } },
    ];
    expect(
      findDuplicateWidget(existing, {
        type: 'spending-card',
        meta: { mode: 'budget', name: 'Budget' },
      })?.id,
    ).toBe('2');
    expect(
      findDuplicateWidget(existing, { type: 'net-worth-card', meta: {} })?.id,
    ).toBe('1');
    expect(
      findDuplicateWidget(existing, { type: 'cash-flow-card', meta: null }),
    ).toBeUndefined();
  });

  it('the default dashboard contains no duplicates', () => {
    DEFAULT_DASHBOARD_STATE.forEach((widget, index) => {
      const others = DEFAULT_DASHBOARD_STATE.filter((_, i) => i !== index);
      expect(findDuplicateWidget(others, widget)).toBeUndefined();
    });
  });
});
