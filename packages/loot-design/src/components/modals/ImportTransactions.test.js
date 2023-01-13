import { parseDate } from './ImportTransactions';

describe('Import transactions', function () {
  describe('date parsing', function () {
    it('should not parse', function () {
      const invalidInputs = [
        { str: '', order: 'yyyy mm dd' },
        { str: null, order: 'yyyy mm dd' },
        { str: 42, order: 'yyyy mm dd' },
        { str: {}, order: 'yyyy mm dd' },
        { str: [], order: 'yyyy mm dd' },
        { str: 'invalid', order: 'yyyy mm dd' },
        { str: '2020 Dec 24', order: 'yyyy mm dd' },
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
        { str: '2020', order: 'mm dd yy' }
      ];

      for (const { str, order } of invalidInputs) {
        expect(parseDate(str, order)).toBe(null);
      }
    });

    it('should parse', function () {
      const validInputs = [
        {
          order: 'yyyy mm dd',
          cases: [
            '20201224',
            '2020 12 24',
            '2020-12-24',
            '2020/12/24',
            ' 2020 / 12 / 24',
            '2020/12/24 ',
            '2020 12-24 '
          ]
        },
        {
          order: 'yy mm dd',
          cases: [
            '201224',
            '20 12 24',
            '20-12-24',
            '20/12/24',
            '20/12/24',
            '20/12/24 ',
            '20 12-24 '
          ]
        },
        {
          order: 'mm dd yyyy',
          cases: [
            '12242020',
            '12 24 2020 ',
            '12-24-2020',
            '12/24/2020',
            ' 12/24/2020',
            '12/24/2020',
            '12 24-2020'
          ]
        },
        {
          order: 'mm dd yy',
          cases: [
            '122420',
            '12 24 20 ',
            '12-24-20',
            '12/24/20',
            ' 12/24/20',
            '12/24/20',
            '12 24-20'
          ]
        },
        {
          order: 'dd mm yyyy',
          cases: [
            '24122020',
            '24 12 2020 ',
            '24-12-2020',
            '24/12/2020',
            ' 24/12/2020',
            '24/12/2020 ',
            '24-12 2020'
          ]
        },
        {
          order: 'dd mm yy',
          cases: [
            '241220',
            '2412 20 ',
            '24-12-20',
            '24/12/20',
            ' 24/12/20',
            '24/12/20 ',
            '24 12-20 '
          ]
        }
      ];

      for (const { order, cases } of validInputs) {
        for (const str of cases) {
          const parsed = parseDate(str, order);
          expect(typeof parsed).toBe('string');
          expect(parsed).toBe('2020-12-24');
        }
      }
    });
  });
});
