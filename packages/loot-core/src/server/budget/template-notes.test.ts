import type { Template } from '../../types/models/templates';
import * as db from '../db';

import { parse } from './goal-template.pegjs';
import {
  getActiveSchedules,
  getCategoriesWithTemplateNotes,
  resetCategoryGoalDefsWithNoTemplates,
} from './statements';
import type { CategoryWithTemplateNote } from './statements';
import {
  checkTemplateNotes,
  storeNoteTemplates,
  unparse,
} from './template-notes';

vi.mock('../db');
vi.mock('./statements');

function mockGetTemplateNotesForCategories(
  templateNotes: CategoryWithTemplateNote[],
) {
  vi.mocked(getCategoriesWithTemplateNotes).mockResolvedValue(templateNotes);
}

function mockGetActiveSchedules(schedules: db.DbSchedule[]) {
  vi.mocked(getActiveSchedules).mockResolvedValue(schedules);
}

function mockDbUpdate() {
  vi.mocked(db.updateWithSchema).mockResolvedValue(undefined);
}

describe('storeNoteTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const testCases = [
    {
      description: 'Stores templates for categories with valid template notes',
      mockTemplateNotes: [
        {
          id: 'cat1',
          name: 'Category 1',
          note: '#template 10',
        },
      ],
      expectedTemplates: [
        {
          type: 'simple',
          monthly: 10,
          limit: null,
          priority: 0,
          directive: 'template',
        },
      ],
    },
    {
      description:
        'Stores negative templates for categories with valid template notes',
      mockTemplateNotes: [
        {
          id: 'cat1',
          name: 'Category 1',
          note: '#template -103.23',
        },
      ],
      expectedTemplates: [
        {
          type: 'simple',
          monthly: -103.23,
          limit: null,
          priority: 0,
          directive: 'template',
        },
      ],
    },
    {
      description:
        'Stores template when prefix is used with valid template notes',
      mockTemplateNotes: [
        {
          id: 'cat1',
          name: 'Category 1',
          note: 'test: #template 12',
        },
      ],
      expectedTemplates: [
        {
          type: 'simple',
          monthly: 12,
          limit: null,
          priority: 0,
          directive: 'template',
        },
      ],
    },
    {
      description:
        'Stores templates for categories with valid goal directive template notes',
      mockTemplateNotes: [
        {
          id: 'cat1',
          name: 'Category 1',
          note: '#goal 10',
        },
      ],
      expectedTemplates: [
        {
          type: 'goal',
          amount: 10,
          priority: null,
          directive: 'goal',
        },
      ],
    },
    {
      description: 'Does not store empty template notes',
      mockTemplateNotes: [{ id: 'cat1', name: 'Category 1', note: '' }],
      expectedTemplates: [],
    },
    {
      description: 'Does not store non template notes',
      mockTemplateNotes: [
        { id: 'cat1', name: 'Category 1', note: 'Not a template note' },
      ],
      expectedTemplates: [],
    },
  ];

  it.each(testCases)(
    '$description',
    async ({ mockTemplateNotes, expectedTemplates }) => {
      // Given
      mockGetTemplateNotesForCategories(mockTemplateNotes);
      mockDbUpdate();

      // When
      await storeNoteTemplates();

      // Then
      if (expectedTemplates.length === 0) {
        expect(db.updateWithSchema).not.toHaveBeenCalled();
        expect(resetCategoryGoalDefsWithNoTemplates).toHaveBeenCalled();
        return;
      }

      mockTemplateNotes.forEach(({ id }) => {
        expect(db.updateWithSchema).toHaveBeenCalledWith('categories', {
          id,
          goal_def: JSON.stringify(expectedTemplates),
          template_settings: { source: 'notes' },
        });
      });
      expect(resetCategoryGoalDefsWithNoTemplates).toHaveBeenCalled();
    },
  );
});

describe('checkTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const testCases = [
    {
      description: 'Returns success message when templates pass',
      mockTemplateNotes: [
        {
          id: 'cat1',
          name: 'Category 1',
          note: '#template 10',
        },
        {
          id: 'cat1',
          name: 'Category 1',
          note: '#template schedule Mock Schedule 1',
        },
      ],
      mockSchedules: mockSchedules(),
      expected: {
        type: 'message',
        message: 'All templates passed! 🎉',
      },
    },
    {
      description: 'Skips notes that are not templates',
      mockTemplateNotes: [
        {
          id: 'cat1',
          name: 'Category 1',
          note: 'Not a template note',
        },
      ],
      mockSchedules: mockSchedules(),
      expected: {
        type: 'message',
        message: 'All templates passed! 🎉',
      },
    },
    {
      description: 'Returns errors for templates with parsing errors',
      mockTemplateNotes: [
        {
          id: 'cat1',
          name: 'Category 1',
          note: '#template broken template',
        },
      ],
      mockSchedules: mockSchedules(),
      expected: {
        sticky: true,
        message: 'There were errors interpreting some templates:',
        pre: 'Category 1: #template broken template',
      },
    },
    {
      description: 'Returns errors for non-existent schedules',
      mockTemplateNotes: [
        {
          id: 'cat1',
          name: 'Category 1',
          note: '#template schedule Non-existent Schedule',
        },
      ],
      mockSchedules: mockSchedules(),
      expected: {
        sticky: true,
        message: 'There were errors interpreting some templates:',
        pre: 'Category 1: Schedule "Non-existent Schedule" does not exist',
      },
    },
    {
      description: 'Returns errors for invalid increase schedule adjustments',
      mockTemplateNotes: [
        {
          id: 'cat1',
          name: 'Category 1',
          note: '#template schedule Mock Schedule 1 [increase 1001%]',
        },
      ],
      mockSchedules: mockSchedules(),
      expected: {
        sticky: true,
        message: 'There were errors interpreting some templates:',
        pre: 'Category 1: #template schedule Mock Schedule 1 [increase 1001%]\nError: Invalid adjustment percentage (1001%). Must be between -100% and 1000%',
      },
    },
    {
      description: 'Returns errors for invalid decrease schedule adjustments',
      mockTemplateNotes: [
        {
          id: 'cat1',
          name: 'Category 1',
          note: '#template schedule Mock Schedule 1 [decrease 101%]',
        },
      ],
      mockSchedules: mockSchedules(),
      expected: {
        sticky: true,
        message: 'There were errors interpreting some templates:',
        pre: 'Category 1: #template schedule Mock Schedule 1 [decrease 101%]\nError: Invalid adjustment percentage (-101%). Must be between -100% and 1000%',
      },
    },
  ];

  it.each(testCases)(
    '$description',
    async ({ mockTemplateNotes, mockSchedules, expected }) => {
      // Given
      mockGetTemplateNotesForCategories(mockTemplateNotes);
      mockGetActiveSchedules(mockSchedules);

      // When
      const result = await checkTemplateNotes();

      // Then
      expect(result).toEqual(expected);
    },
  );
});

function mockSchedules(): db.DbSchedule[] {
  return [
    {
      id: 'mock-schedule-1',
      rule: 'mock-rule',
      active: 1,
      completed: 0,
      posts_transaction: 0,
      tombstone: 0,
      name: 'Mock Schedule 1',
    },
    {
      id: 'mock-schedule-2',
      rule: 'mock-rule',
      active: 1,
      completed: 0,
      posts_transaction: 0,
      tombstone: 0,
      name: 'Mock Schedule 2',
    },
  ];
}

describe('unparse/parse round-trip', () => {
  const cases: string[] = [
    // simple
    '#template 10',
    '#template up to 50',
    '#template up to 25 per day hold',
    '#template up to 100 per week starting 2025-01-01',
    '#template-2 123.45',
    // schedule
    '#template schedule Rent',
    '#template schedule full Mortgage',
    '#template schedule Netflix [increase 10%]',
    '#template schedule full Groceries [decrease 5%]',
    // percentage
    '#template 50% of Utilities',
    '#template 75% of previous Dining Out',
    // periodic
    '#template 200 repeat every 2 months starting 2025-06-01',
    '#template 300 repeat every week starting 2025-01-07',
    '#template 400 repeat every year starting 2025-01-01 up to 50',
    // by / spend
    '#template 500 by 2025-12',
    '#template 600 by 2025-11 repeat every month',
    '#template 700 by 2025-10 repeat every 2 months',
    '#template 800 by 2025-09 repeat every year',
    '#template 900 by 2025-08 repeat every 3 years',
    '#template 1000 by 2025-07 spend from 2025-01 repeat every month',
    '#template 1100 by 2025-06 spend from 2025-02 repeat every 2 months',
    // remainder
    '#template remainder',
    '#template remainder 2',
    '#template remainder 3 up to 10',
    // average
    '#template average 6 months',
    '#template-5 average 12 months',
    // copy
    '#template copy from 3 months ago',
    '#template copy from 6 months ago',
    // goal
    '#goal 1234',
  ];

  it.each(cases)('round-trips: %s', async original => {
    const parsed: Template = parse(original);
    const serialized = await unparse([parsed]);
    const reparsed: Template = parse(serialized);

    expect(parsed).toEqual(reparsed);
  });
});

describe('unparse limit templates', () => {
  it('serializes refill limits to notes syntax', async () => {
    const serialized = await unparse([
      {
        type: 'limit',
        amount: 150,
        hold: false,
        period: 'monthly',
        directive: 'template',
        priority: null,
      },
      {
        type: 'refill',
        directive: 'template',
        priority: 2,
      },
    ]);

    expect(serialized).toBe('#template-2 up to 150');
  });

  it('serializes non-refill limits with a zero base amount', async () => {
    const serialized = await unparse([
      {
        type: 'limit',
        amount: 200,
        hold: false,
        period: 'monthly',
        directive: 'template',
        priority: null,
      },
    ]);

    expect(serialized).toBe('#template 0 up to 200');
  });
});
