import {
  getActiveCategories,
  getActiveSchedules,
  getTemplateNotesForCategories,
  getTemplateNotesForCategory,
} from './statements';
import {
  checkTemplateNotes,
  getCategoriesWithTemplates,
} from './template-notes';

jest.mock('../db');
jest.mock('./statements');

describe('getCategoriesWithTemplates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const testCases = [
    {
      description: 'Returns categories with parsed templates',
      mockTemplateNotes: [
        { category_id: 'category 1', note: '#template 10' },
        { category_id: 'category 2', note: '#template up to 100' },
      ],
      expected: [
        {
          category_id: 'category 1',
          templates: [
            {
              directive: 'template',
              limit: null,
              monthly: 10,
              priority: 0,
              type: 'simple',
            },
          ],
        },
        {
          category_id: 'category 2',
          templates: [
            {
              directive: 'template',
              limit: {
                amount: 100,
                hold: false,
              },
              priority: 0,
              type: 'simple',
            },
          ],
        },
      ],
    },
    {
      description: 'Handles parsing errors gracefully',
      mockTemplateNotes: [{ category_id: 'cat1', note: 'template1\ninvalid' }],
      expected: [{ category_id: 'cat1', templates: [] }],
    },
    {
      description: 'Handles empty notes',
      mockTemplateNotes: [{ category_id: 'cat1', note: '' }],
      expected: [{ category_id: 'cat1', templates: [] }],
    },
    {
      description: 'Handles non template notes',
      mockTemplateNotes: [{ category_id: 'cat1', note: 'test note' }],
      expected: [{ category_id: 'cat1', templates: [] }],
    },
    {
      description: 'Handles multiple lines in notes',
      mockTemplateNotes: [
        { category_id: 'cat1', note: '#template 100\n #template 200' },
      ],
      expected: [
        {
          category_id: 'cat1',
          templates: [
            {
              directive: 'template',
              limit: null,
              monthly: 100,
              priority: 0,
              type: 'simple',
            },
            {
              directive: 'template',
              limit: null,
              monthly: 200,
              priority: 0,
              type: 'simple',
            },
          ],
        },
      ],
    },
  ];

  it.each(testCases)(
    '$description',
    async ({ mockTemplateNotes, expected }) => {
      // Given
      (getTemplateNotesForCategories as jest.Mock).mockResolvedValue(
        mockTemplateNotes,
      );

      // When
      const result = await getCategoriesWithTemplates();

      // Then
      expect(result).toEqual(expected);
    },
  );
});

describe('checkTemplateNotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Returns message when all templates pass', async () => {
    // Given
    (getActiveCategories as jest.Mock).mockResolvedValue([
      { id: 'cat1', name: 'Category 1' },
    ]);
    (getActiveSchedules as jest.Mock).mockResolvedValue([createMockSchedule()]);
    (getTemplateNotesForCategory as jest.Mock).mockResolvedValue([
      { type: 'schedule', name: 'Schedule 1' },
    ]);

    // When
    const result = await checkTemplateNotes();

    // Then
    expect(result).toEqual({
      type: 'message',
      message: 'All templates passed! 🎉',
    });
  });

  it('Returns errors for templates with parsing errors', async () => {
    // Given
    (getActiveCategories as jest.Mock).mockResolvedValue([
      { id: 'cat1', name: 'Category 1' },
    ]);
    (getActiveSchedules as jest.Mock).mockResolvedValue([createMockSchedule()]);
    (getTemplateNotesForCategory as jest.Mock).mockResolvedValue([
      { type: 'error', line: 'Invalid template' },
    ]);

    // When
    const result = await checkTemplateNotes();

    // Then
    expect(result).toEqual({
      sticky: true,
      message: 'There were errors interpreting some templates:',
      pre: 'Category 1: Invalid template',
    });
  });

  it('Returns errors for non-existent schedules', async () => {
    // Given
    (getActiveCategories as jest.Mock).mockResolvedValue([
      { id: 'cat1', name: 'Category 1' },
    ]);
    (getActiveSchedules as jest.Mock).mockResolvedValue([createMockSchedule()]);
    (getTemplateNotesForCategory as jest.Mock).mockResolvedValue([
      { type: 'schedule', name: 'Non-existent Schedule' },
    ]);

    // When
    const result = await checkTemplateNotes();

    // Then
    expect(result).toEqual({
      sticky: true,
      message: 'There were errors interpreting some templates:',
      pre: 'Category 1: Schedule “Non-existent Schedule” does not exist',
    });
  });

  it('Handles multiple categories and notes', async () => {
    (getActiveCategories as jest.Mock).mockResolvedValue([
      { id: 'cat1', name: 'Category 1' },
      { id: 'cat2', name: 'Category 2' },
    ]);
    (getActiveSchedules as jest.Mock).mockResolvedValue([createMockSchedule()]);
    (getTemplateNotesForCategory as jest.Mock)
      .mockResolvedValueOnce([{ type: 'schedule', name: 'Schedule 1' }])
      .mockResolvedValueOnce([{ type: 'error', line: 'Invalid template' }]);

    const result = await checkTemplateNotes();

    expect(result).toEqual({
      sticky: true,
      message: 'There were errors interpreting some templates:',
      pre: 'Category 2: Invalid template',
    });
  });
});

function createMockSchedule(name = 'Schedule 1'): Schedule {
  return {
    id: 'schedule1',
    rule: 'rule string',
    active: 1,
    completed: 0,
    posts_transaction: 0,
    tombstone: 0,
    name,
  };
}
