import { assignColumns, inferColumnRole } from './columnRoles';
import type { QueryResult } from './processQueryResult';

describe('columnRoles', () => {
  describe('inferColumnRole', () => {
    const cases: Array<{
      type: QueryResult['columns'][number]['type'];
      expected: ReturnType<typeof inferColumnRole>;
    }> = [
      { type: 'date', expected: 'time' },
      { type: 'date-month', expected: 'time' },
      { type: 'date-year', expected: 'time' },
      { type: 'integer', expected: 'measure' },
      { type: 'float', expected: 'measure' },
      { type: 'number', expected: 'measure' },
      { type: 'boolean', expected: 'dimension' },
      { type: 'string', expected: 'dimension' },
      { type: 'id', expected: 'id' },
    ];

    for (const { type, expected } of cases) {
      it(`infers ${type} as ${expected}`, () => {
        expect(inferColumnRole({ name: 'col', type })).toBe(expected);
      });
    }
  });

  describe('assignColumns', () => {
    it('groups columns by role preserving order', () => {
      const result: QueryResult = {
        columns: [
          { name: 'date', type: 'date' },
          { name: 'account', type: 'id' },
          { name: 'category', type: 'string' },
          { name: 'amount', type: 'float' },
          { name: 'count', type: 'integer' },
          { name: 'note', type: 'string' },
        ],
        rows: [],
      };

      expect(assignColumns(result)).toEqual({
        timeColumns: ['date'],
        dimensionColumns: ['account', 'category', 'note'],
        measureColumns: ['amount', 'count'],
        idColumns: ['account'],
      });
    });

    it('returns empty arrays for an empty result', () => {
      expect(assignColumns({ columns: [], rows: [] })).toEqual({
        timeColumns: [],
        dimensionColumns: [],
        measureColumns: [],
        idColumns: [],
      });
    });

    it('treats id columns as dimensions but tracks them separately', () => {
      const result: QueryResult = {
        columns: [
          { name: 'a', type: 'id' },
          { name: 'b', type: 'id' },
        ],
        rows: [],
      };
      const assignment = assignColumns(result);
      expect(assignment.idColumns).toEqual(['a', 'b']);
      expect(assignment.dimensionColumns).toEqual(['a', 'b']);
      expect(assignment.timeColumns).toEqual([]);
      expect(assignment.measureColumns).toEqual([]);
    });
  });
});
