import type { Template } from '@actual-app/core/types/models/templates';

import { migrateTemplatesToAutomations } from './migrateTemplatesToAutomations';

describe('migrateTemplatesToAutomations', () => {
  it('drops simple templates that have no limit and no monthly amount', () => {
    // these would otherwise be pushed as a phantom 'fixed' entry that
    // crashes FixedAutomationReadOnly (no .amount, no .period)
    const simpleTemplate = {
      type: 'simple',
      directive: 'template',
      priority: 5,
    } satisfies Template;

    expect(migrateTemplatesToAutomations([simpleTemplate])).toEqual([]);
  });

  it('drops simple templates whose monthly amount is zero with no limit', () => {
    const simpleTemplate = {
      type: 'simple',
      directive: 'template',
      priority: 5,
      monthly: 0,
    } satisfies Template;

    expect(migrateTemplatesToAutomations([simpleTemplate])).toEqual([]);
  });

  it('migrates a goal directive to a long-term goal entry', () => {
    const goalTemplate = {
      type: 'goal',
      amount: 1000,
      directive: 'goal',
    } satisfies Template;

    const [entry, ...rest] = migrateTemplatesToAutomations([goalTemplate]);
    expect(rest).toHaveLength(0);
    expect(entry.displayType).toBe('goal');
    expect(entry.template).toEqual(goalTemplate);
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
    expect(result[0].displayType).toBe('fixed');
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

  it('expands a simple template with both limit and monthly into limit + periodic (no implicit refill)', () => {
    // `#template 20 up to 200 per week` budgets 20/month and caps at the
    // limit — the engine's runSimple returns just the monthly value, so
    // there is no implicit refill-to-cap behaviour to migrate.
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

    expect(result).toHaveLength(2);
    expect(result.map(entry => entry.displayType)).toEqual(['limit', 'fixed']);
    expect(result[1].template).toMatchObject({
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
