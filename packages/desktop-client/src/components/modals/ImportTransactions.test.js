import { parseDate } from './ImportTransactions';

describe('Import transactions', function () {
  describe('date parsing', function () {
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
      { str: '2020', order: 'mm dd yy' },
    ];

    it.each(invalidInputs)(
      'should not parse string `$str` with order `$order`',
      ({ str, order }) => {
        expect(parseDate(str, order)).toBe(null);
      },
    );

    const validInputs = [
      {
        order: 'yyyy mm dd',
        cases: [
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
});
