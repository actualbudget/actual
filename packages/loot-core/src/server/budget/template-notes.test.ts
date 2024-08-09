import * as db from '../db';
import { Schedule } from '../db/types';

import {
  CategoryWithTemplateNote,
  getActiveSchedules,
  getCategoriesWithTemplateNotes,
  resetCategoryGoalDefsWithNoTemplates,
} from './statements';
import { checkTemplates, storeTemplates } from './template-notes';

jest.mock('../db');
jest.mock('./statements');

function mockGetTemplateNotesForCategories(
  templateNotes: CategoryWithTemplateNote[],
) {
  (getCategoriesWithTemplateNotes as jest.Mock).mockResolvedValue(
    templateNotes,
  );
}

function mockGetActiveSchedules(schedules: Schedule[]) {
  (getActiveSchedules as jest.Mock).mockResolvedValue(schedules);
}

function mockDbUpdate() {
  (db.update as jest.Mock).mockResolvedValue(undefined);
}

describe('storeTemplates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
          type: 'simple',
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
      await storeTemplates();

      // Then
      if (expectedTemplates.length === 0) {
        expect(db.update).not.toHaveBeenCalled();
        expect(resetCategoryGoalDefsWithNoTemplates).toHaveBeenCalled();
        return;
      }

      mockTemplateNotes.forEach(({ id }) => {
        expect(db.update).toHaveBeenCalledWith('categories', {
          id,
          goal_def: JSON.stringify(expectedTemplates),
        });
      });
      expect(resetCategoryGoalDefsWithNoTemplates).toHaveBeenCalled();
    },
  );
});

describe('checkTemplates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
        pre: 'cat1: Schedule “Non-existent Schedule” does not exist',
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
      const result = await checkTemplates();

      // Then
      expect(result).toEqual(expected);
    },
  );
});

function mockSchedules(): Schedule[] {
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
