import { collectNewOverspending } from './useOverspendingAlerts';
import { isOverspentBalance } from './util';

describe('isOverspentBalance', () => {
  it('treats negative balances as overspent', () => {
    expect(isOverspentBalance(-1)).toBe(true);
    expect(isOverspentBalance(-15000)).toBe(true);
  });

  it('does not treat zero, positive or missing balances as overspent', () => {
    expect(isOverspentBalance(0)).toBe(false);
    expect(isOverspentBalance(2500)).toBe(false);
    expect(isOverspentBalance(null)).toBe(false);
    expect(isOverspentBalance(undefined)).toBe(false);
  });
});

describe('collectNewOverspending', () => {
  it('reports every category that is overspent on first load', () => {
    const alerted = new Set<string>();

    expect(
      collectNewOverspending(
        alerted,
        new Map([['2026-10', ['food', 'rent', 'power']]]),
      ),
    ).toEqual([
      { month: '2026-10', categoryId: 'food' },
      { month: '2026-10', categoryId: 'rent' },
      { month: '2026-10', categoryId: 'power' },
    ]);
  });

  it('does not alert again while a category stays overspent', () => {
    const alerted = new Set<string>();
    collectNewOverspending(alerted, new Map([['2026-10', ['food']]]));

    expect(
      collectNewOverspending(alerted, new Map([['2026-10', ['food']]])),
    ).toEqual([]);
  });

  it('alerts when a category crosses into overspending', () => {
    const alerted = new Set<string>();
    collectNewOverspending(alerted, new Map([['2026-10', ['food']]]));

    expect(
      collectNewOverspending(alerted, new Map([['2026-10', ['food', 'rent']]])),
    ).toEqual([{ month: '2026-10', categoryId: 'rent' }]);
  });

  it('alerts again after a category recovers and overspends again', () => {
    const alerted = new Set<string>();
    collectNewOverspending(alerted, new Map([['2026-10', ['food']]]));
    collectNewOverspending(alerted, new Map([['2026-10', []]]));

    expect(
      collectNewOverspending(alerted, new Map([['2026-10', ['food']]])),
    ).toEqual([{ month: '2026-10', categoryId: 'food' }]);
  });

  it('tracks each month separately', () => {
    const alerted = new Set<string>();
    collectNewOverspending(alerted, new Map([['2026-10', ['food']]]));

    expect(
      collectNewOverspending(alerted, new Map([['2026-11', ['food']]])),
    ).toEqual([{ month: '2026-11', categoryId: 'food' }]);
  });

  it('keeps alerts for months that are not being compared', () => {
    const alerted = new Set<string>();
    collectNewOverspending(alerted, new Map([['2026-10', ['food']]]));
    collectNewOverspending(alerted, new Map([['2026-11', []]]));

    expect(
      collectNewOverspending(alerted, new Map([['2026-10', ['food']]])),
    ).toEqual([]);
  });
});
