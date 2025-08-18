import * as db from '../db';

import {
  CategoryWithTemplateNote,
  getActiveSchedules,
  getCategoriesWithTemplateNotes,
  resetCategoryGoalDefsWithNoTemplates,
} from './statements';
import { checkTemplateNotes, storeNoteTemplates } from './template-notes';

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
        pre: 'Category 1: Schedule “Non-existent Schedule” does not exist',
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
