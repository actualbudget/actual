import { applyFieldMappings, parseDate } from './utils';

describe('Import transactions', () => {
  describe('date parsing', () => {
    const invalidInputs: Array<{
      str: Parameters<typeof parseDate>[0];
      order: Parameters<typeof parseDate>[1];
    }> = [
      { str: '', order: 'yyyy mm dd' },
      { str: null, order: 'yyyy mm dd' },
      { str: 42, order: 'yyyy mm dd' },
      { str: {}, order: 'yyyy mm dd' },
      { str: [], order: 'yyyy mm dd' },
      { str: 'Decimal 24 2020', order: 'mm dd yyyy' },
      { str: '24 aDec 2020', order: 'dd mm yyyy' },
      { str: 'invalid', order: 'yyyy mm dd' },
      { str: '12 24 20', order: 'mm dd yyyy' },
      { str: '20 12 24', order: 'yyyy mm dd' },
      { str: '2020 12 24', order: 'yy mm dd' },
      { str: '12 24 2020', order: 'mm dd yy' },
      { str: '12 00 2020', order: 'mm dd yyyy' },
      { str: '12 32 2020', order: 'mm dd yyyy' },
      { str: '13 24 2020', order: 'mm dd yyyy' },
      { str: '00 24 2020', order: 'mm dd yyyy' },
      { str: '02 30 2020', order: 'mm dd yyyy' },
      { str: '04 31 2020', order: 'mm dd yyyy' },
      { str: '04 31 2020', order: 'mm dd yyyy' },
      { str: '06 31 2020', order: 'mm dd yyyy' },
      { str: '09 31 2020', order: 'mm dd yyyy' },
      { str: '11 31 2020', order: 'mm dd yyyy' },
      { str: '2046 31 2020', order: 'mm dd yyyy' },
      { str: '2011 31 2020', order: 'mm dd yy' },
      { str: '2020', order: 'mm dd yy' },
    ];

    it.each(invalidInputs)(
      'should not parse string `$str` with order `$order`',
      ({ str, order }) => {
        expect(parseDate(str, order)).toBe(null);
      },
    );

    const validInputs: Array<{
      order: Parameters<typeof parseDate>[1];
      cases: [Parameters<typeof parseDate>[0], ReturnType<typeof parseDate>][];
    }> = [
      {
        order: 'yyyy mm dd',
        cases: [
          ['2020 Dec 24', '2020-12-24'],
          ['2020 Dec. 24', '2020-12-24'],
          ['2020 December 24', '2020-12-24'],
          ['20201224', '2020-12-24'],
          ['2020 12 24', '2020-12-24'],
          ['2020-1-2', '2020-01-02'],
          ['2020-12-24', '2020-12-24'],
          ['2020/12/24', '2020-12-24'],
          [' 2020 / 12 / 24', '2020-12-24'],
          ['2020/12/24 ', '2020-12-24'],
          ['2020 12-24 ', '2020-12-24'],
          ['2023-01-19T02:36:52', '2023-01-19'],
        ],
      },
      {
        order: 'yy mm dd',
        cases: [
          ['20 Dec 24', '2020-12-24'],
          ['20 Dec. 24', '2020-12-24'],
          ['20 December 24', '2020-12-24'],
          ['201224', '2020-12-24'],
          ['20 12 24', '2020-12-24'],
          ['20-12-24', '2020-12-24'],
          ['20/12/24', '2020-12-24'],
          ['20/12/24', '2020-12-24'],
          ['20/12/24 ', '2020-12-24'],
          ['20/1/2 ', '2020-01-02'],
          ['20 12-24 ', '2020-12-24'],
        ],
      },
      {
        order: 'mm dd yyyy',
        cases: [
          ['Dec 24, 2020', '2020-12-24'],
          ['Dec. 24, 2020', '2020-12-24'],
          ['December 24, 2020', '2020-12-24'],
          ['12242020', '2020-12-24'],
          ['1 24 2020', '2020-01-24'],
          ['01 24 2020', '2020-01-24'],
          ['12 24 2020 ', '2020-12-24'],
          ['12-24-2020', '2020-12-24'],
          ['12/24/2020', '2020-12-24'],
          [' 12/24/2020', '2020-12-24'],
          ['12/24/2020', '2020-12-24'],
          ['12 24-2020', '2020-12-24'],
        ],
      },
      {
        order: 'mm dd yy',
        cases: [
          ['Dec 24, 20', '2020-12-24'],
          ['Dec. 24, 20', '2020-12-24'],
          ['December 24, 20', '2020-12-24'],
          ['122420', '2020-12-24'],
          ['12 24 20 ', '2020-12-24'],
          ['12-24-20', '2020-12-24'],
          ['1-24-20', '2020-01-24'],
          ['01-24-20', '2020-01-24'],
          ['12/24/20', '2020-12-24'],
          [' 12/24/20', '2020-12-24'],
          ['12/24/20', '2020-12-24'],
          ['1/24/20', '2020-01-24'],
          ['12 24-20', '2020-12-24'],
        ],
      },
      {
        order: 'dd mm yyyy',
        cases: [
          ['24 Dec 2020', '2020-12-24'],
          ['24 Dec. 2020', '2020-12-24'],
          ['24 December 2020', '2020-12-24'],
          ['24122020', '2020-12-24'],
          ['24 12 2020 ', '2020-12-24'],
          ['2 12 2020', '2020-12-02'],
          ['02 12 2020 ', '2020-12-02'],
          ['24-12-2020', '2020-12-24'],
          ['02-12-2020', '2020-12-02'],
          ['24/12/2020', '2020-12-24'],
          [' 24/12/2020', '2020-12-24'],
          ['24/12/2020 ', '2020-12-24'],
          ['2/12/2020 ', '2020-12-02'],
          ['24-12 2020', '2020-12-24'],
        ],
      },
      {
        order: 'dd mm yy',
        cases: [
          ['24 Dec 20', '2020-12-24'],
          ['24 Dec. 20', '2020-12-24'],
          ['24 December 20', '2020-12-24'],
          ['241220', '2020-12-24'],
          ['2412 20 ', '2020-12-24'],
          ['24-12-20', '2020-12-24'],
          ['2-12-20', '2020-12-02'],
          ['02-12-20', '2020-12-02'],
          ['24/12/20', '2020-12-24'],
          [' 24/12/20', '2020-12-24'],
          ['24/12/20 ', '2020-12-24'],
          ['2/12/20', '2020-12-02'],
          ['02/12/20', '2020-12-02'],
          ['24 12-20 ', '2020-12-24'],
        ],
      },
    ];

    describe.each(validInputs)(
      'should parse with order `$order`',
      ({ order, cases }) => {
        it.each(cases)('given input %j expects output %j', (input, output) => {
          const parsed = parseDate(input, order);

          expect(typeof parsed).toBe('string');
          expect(parsed).toBe(output);
        });
      },
    );
  });

  describe('category detection', () => {
    describe('applyFieldMappings', () => {
      it('should map category field when specified in mappings', () => {
        const transaction = {
          date: '2024-01-15',
          payee_name: 'Test Store',
          amount: 100,
          inflow: 0,
          outflow: 100,
          inOut: '',
          'Category Name': 'Groceries',
          trx_id: '1',
          existing: false,
          ignored: false,
          selected: true,
          selected_merge: false,
        };

        const mappings = {
          date: 'date',
          payee: 'payee_name',
          amount: 'amount',
          category: 'Category Name',
          notes: null,
          inOut: null,
          outflow: null,
          inflow: null,
        };

        const result = applyFieldMappings(transaction, mappings);

        expect(result.category).toBe('Groceries');
        expect(result.payee_name).toBe('Test Store');
        expect(result.date).toBe('2024-01-15');
        expect(result.trx_id).toBe('1');
      });

      it('should handle category field with different column name', () => {
        const transaction = {
          date: '2024-01-15',
          payee_name: 'Restaurant',
          amount: 50,
          inflow: 0,
          outflow: 50,
          inOut: '',
          cat: 'Dining Out',
          trx_id: '2',
          existing: false,
          ignored: false,
          selected: true,
          selected_merge: false,
        };

        const mappings = {
          date: 'date',
          payee: 'payee_name',
          amount: 'amount',
          category: 'cat',
          notes: null,
          inOut: null,
          outflow: null,
          inflow: null,
        };

        const result = applyFieldMappings(transaction, mappings);

        expect(result.category).toBe('Dining Out');
      });

      it('should handle missing category field', () => {
        const transaction = {
          date: '2024-01-15',
          payee_name: 'Store',
          amount: 75,
          inflow: 0,
          outflow: 75,
          inOut: '',
          trx_id: '3',
          existing: false,
          ignored: false,
          selected: true,
          selected_merge: false,
        };

        const mappings = {
          date: 'date',
          payee: 'payee_name',
          amount: 'amount',
          notes: null,
          inOut: null,
          category: null,
          outflow: null,
          inflow: null,
        };

        const result = applyFieldMappings(transaction, mappings);

        expect(result.category).toBeUndefined();
      });

      it('should handle null category mapping', () => {
        const transaction = {
          date: '2024-01-15',
          payee_name: 'Store',
          amount: 75,
          inflow: 0,
          outflow: 75,
          inOut: '',
          'Category Name': 'Shopping',
          trx_id: '4',
          existing: false,
          ignored: false,
          selected: true,
          selected_merge: false,
        };

        const mappings = {
          date: 'date',
          payee: 'payee_name',
          amount: 'amount',
          category: null,
          notes: null,
          inOut: null,
          outflow: null,
          inflow: null,
        };

        const result = applyFieldMappings(transaction, mappings);

        // When mapping is null, it should map to the field itself (category)
        expect(result.category).toBeUndefined();
      });

      it('should preserve preview fields', () => {
        const transaction = {
          date: '2024-01-15',
          payee_name: 'Store',
          amount: 100,
          inflow: 0,
          outflow: 100,
          inOut: '',
          category: 'Entertainment',
          trx_id: '5',
          existing: true,
          ignored: false,
          selected: true,
          selected_merge: false,
          tombstone: false,
        };

        const mappings = {
          date: 'date',
          payee: 'payee_name',
          amount: 'amount',
          category: 'category',
          notes: null,
          inOut: null,
          outflow: null,
          inflow: null,
        };

        const result = applyFieldMappings(transaction, mappings);

        expect(result.trx_id).toBe('5');
        expect(result.existing).toBe(true);
        expect(result.ignored).toBe(false);
        expect(result.selected).toBe(true);
        expect(result.selected_merge).toBe(false);
        expect(result.tombstone).toBe(false);
      });

      it('should handle multiple transactions with various category values', () => {
        const transactions = [
          {
            date: '2024-01-15',
            payee_name: 'Store A',
            amount: 100,
            inflow: 0,
            outflow: 100,
            inOut: '',
            cat_column: 'New Category 1',
            trx_id: '1',
            existing: false,
            ignored: false,
            selected: true,
            selected_merge: false,
          },
          {
            date: '2024-01-16',
            payee_name: 'Store B',
            amount: 50,
            inflow: 0,
            outflow: 50,
            inOut: '',
            cat_column: 'New Category 2',
            trx_id: '2',
            existing: false,
            ignored: false,
            selected: true,
            selected_merge: false,
          },
          {
            date: '2024-01-17',
            payee_name: 'Store C',
            amount: 75,
            inflow: 0,
            outflow: 75,
            inOut: '',
            cat_column: '',
            trx_id: '3',
            existing: false,
            ignored: false,
            selected: true,
            selected_merge: false,
          },
        ];

        const mappings = {
          date: 'date',
          payee: 'payee_name',
          amount: 'amount',
          category: 'cat_column',
          notes: null,
          inOut: null,
          outflow: null,
          inflow: null,
        };

        const results = transactions.map(t => applyFieldMappings(t, mappings));

        expect(results[0].category).toBe('New Category 1');
        expect(results[1].category).toBe('New Category 2');
        expect(results[2].category).toBe('');
      });
    });
  });
});
