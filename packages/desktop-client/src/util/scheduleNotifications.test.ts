import type { ScheduleStatuses } from '@actual-app/core/shared/schedules';
import type { ScheduleEntity } from '@actual-app/core/types/models';
import { LocalNotifications } from '@capacitor/local-notifications';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  buildScheduleNotifications,
  cancelScheduleNotifications,
  replaceScheduleNotifications,
} from './scheduleNotifications';

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    getPending: vi.fn(),
    cancel: vi.fn(),
    schedule: vi.fn(),
  },
}));

function makeSchedule(fields: Partial<ScheduleEntity>): ScheduleEntity {
  return {
    id: 'schedule',
    name: 'Rent',
    completed: false,
    next_date: '2026-03-10',
    ...fields,
  } as ScheduleEntity;
}

function build(
  schedules: ScheduleEntity[],
  statuses: Record<string, string> = {},
  now = new Date(2026, 2, 5, 12),
) {
  return buildScheduleNotifications({
    budgetId: 'budget',
    schedules,
    statuses: new Map(Object.entries(statuses)) as ScheduleStatuses,
    title: 'Due today',
    getBody: schedule => schedule.name ?? '',
    now,
  });
}

describe('buildScheduleNotifications', () => {
  it('reminds at 9:00 local time on the next date', () => {
    const [notification] = build([makeSchedule({})]);

    expect(notification).toMatchObject({ title: 'Due today', body: 'Rent' });
    expect(notification.at).toEqual(new Date(2026, 2, 10, 9));
  });

  it('skips schedules that are completed, paid or have no next date', () => {
    const notifications = build(
      [
        makeSchedule({ id: 'completed', completed: true }),
        makeSchedule({ id: 'paid' }),
        makeSchedule({ id: 'undated', next_date: undefined }),
        makeSchedule({ id: 'upcoming', name: 'Internet' }),
      ],
      { paid: 'paid', upcoming: 'upcoming' },
    );

    expect(notifications.map(n => n.body)).toEqual(['Internet']);
  });

  it('skips a reminder whose time has already passed', () => {
    const schedules = [makeSchedule({ next_date: '2026-03-05' })];

    expect(build(schedules, {}, new Date(2026, 2, 5, 8))).toHaveLength(1);
    expect(build(schedules, {}, new Date(2026, 2, 5, 9))).toHaveLength(0);
    expect(
      build([makeSchedule({ next_date: '2026-03-01' })], {
        schedule: 'missed',
      }),
    ).toHaveLength(0);
  });

  it('keeps only the soonest reminders, under the iOS limit of 64', () => {
    const schedules = Array.from({ length: 100 }, (_, i) =>
      makeSchedule({
        id: `schedule-${i}`,
        name: `Schedule ${i}`,
        // Furthest away first, so the order has to come from the sort.
        next_date: `2026-${i < 50 ? '05' : '04'}-10`,
      }),
    );

    const notifications = build(schedules);

    expect(notifications).toHaveLength(60);
    expect(notifications.slice(0, 50).every(n => n.at.getMonth() === 3)).toBe(
      true,
    );
  });

  it('gives every schedule a stable id that fits in a 32-bit integer', () => {
    const schedules = [makeSchedule({ id: 'a' }), makeSchedule({ id: 'b' })];
    const ids = build(schedules).map(n => n.id);

    expect(new Set(ids).size).toBe(2);
    expect(build(schedules).map(n => n.id)).toEqual(ids);
    for (const id of ids) {
      expect(Number.isInteger(id)).toBe(true);
      expect(id).toBeGreaterThanOrEqual(0);
      expect(id).toBeLessThan(2 ** 31);
    }
  });
});

describe('replacing and cancelling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LocalNotifications.getPending).mockResolvedValue({
      notifications: [
        { id: 1, title: '', body: '', extra: { budgetId: 'budget' } },
        { id: 2, title: '', body: '', extra: { budgetId: 'other-budget' } },
      ],
    });
  });

  it('cancels only the reminders of the given budget', async () => {
    await cancelScheduleNotifications('budget');

    expect(LocalNotifications.cancel).toHaveBeenCalledWith({
      notifications: [{ id: 1 }],
    });
  });

  it("replaces the budget's reminders with the new set", async () => {
    const at = new Date(2026, 2, 10, 9);
    await replaceScheduleNotifications('budget', [
      { id: 7, title: 'Due today', body: 'Rent', at },
    ]);

    expect(LocalNotifications.cancel).toHaveBeenCalledWith({
      notifications: [{ id: 1 }],
    });
    expect(LocalNotifications.schedule).toHaveBeenCalledWith({
      notifications: [
        {
          id: 7,
          title: 'Due today',
          body: 'Rent',
          extra: { budgetId: 'budget' },
          schedule: { at, allowWhileIdle: true },
        },
      ],
    });
  });

  it('schedules nothing when there are no reminders', async () => {
    await replaceScheduleNotifications('budget', []);

    expect(LocalNotifications.schedule).not.toHaveBeenCalled();
  });
});
