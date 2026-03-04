import type { Template } from 'loot-core/types/models/templates';

import { migrateTemplatesToAutomations } from './BudgetAutomationsModal';

describe('migrateTemplatesToAutomations', () => {
  it('preserves simple templates that have no limit and no monthly amount', () => {
    const simpleTemplate = {
      type: 'simple',
      directive: 'template',
      priority: 5,
    } satisfies Template;

    const result = migrateTemplatesToAutomations([simpleTemplate]);

    expect(result).toHaveLength(1);
    expect(result[0].displayType).toBe('week');
    expect(result[0].template).toEqual(simpleTemplate);
    expect(result[0].id).toMatch(/^automation-/);
  });

  it('expands a simple template with limit into limit and refill entries', () => {
    const simpleTemplate = {
      type: 'simple',
      directive: 'template',
      priority: 7,
      limit: {
        amount: 120,
        hold: true,
        period: 'monthly',
        start: '2026-02-01',
      },
    } satisfies Template;

    const result = migrateTemplatesToAutomations([simpleTemplate]);

    expect(result).toHaveLength(2);
    expect(result[0].displayType).toBe('limit');
    expect(result[0].template).toEqual({
      type: 'limit',
      amount: 120,
      hold: true,
      period: 'monthly',
      start: '2026-02-01',
      directive: 'template',
      priority: null,
    });
    expect(result[1].displayType).toBe('refill');
    expect(result[1].template).toEqual({
      type: 'refill',
      directive: 'template',
      priority: 7,
    });
  });

  it('expands a simple template with monthly amount into one periodic entry', () => {
    const simpleTemplate = {
      type: 'simple',
      directive: 'template',
      priority: 3,
      monthly: 45,
    } satisfies Template;

    const result = migrateTemplatesToAutomations([simpleTemplate]);

    expect(result).toHaveLength(1);
    expect(result[0].displayType).toBe('week');
    expect(result[0].template).toMatchObject({
      type: 'periodic',
      amount: 45,
      period: {
        period: 'month',
        amount: 1,
      },
      directive: 'template',
      priority: 3,
    });
    expect(result[0].template).toMatchObject({
      starting: expect.any(String),
    });
  });

  it('expands a simple template with both limit and monthly into three entries in order', () => {
    const simpleTemplate = {
      type: 'simple',
      directive: 'template',
      priority: 11,
      monthly: 20,
      limit: {
        amount: 200,
        hold: false,
        period: 'weekly',
      },
    } satisfies Template;

    const result = migrateTemplatesToAutomations([simpleTemplate]);

    expect(result).toHaveLength(3);
    expect(result.map(entry => entry.displayType)).toEqual([
      'limit',
      'refill',
      'week',
    ]);
    expect(result[2].template).toMatchObject({
      type: 'periodic',
      amount: 20,
      directive: 'template',
      priority: 11,
    });
  });

  it('creates a single entry for non-simple templates', () => {
    const scheduleTemplate = {
      type: 'schedule',
      directive: 'template',
      priority: 1,
      name: 'rent',
    } satisfies Template;

    const result = migrateTemplatesToAutomations([scheduleTemplate]);

    expect(result).toHaveLength(1);
    expect(result[0].displayType).toBe('schedule');
    expect(result[0].template).toEqual(scheduleTemplate);
  });
});
