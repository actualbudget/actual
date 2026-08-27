import { Rule } from './rule';
import { migrateIds } from './rule-utils';

describe('migrateIds', () => {
  it('deduplicates mapped IDs in oneOf and notOneOf conditions', () => {
    const rule = new Rule({
      conditionsOp: 'and',
      conditions: [
        {
          op: 'oneOf',
          field: 'payee',
          value: ['payee-a', 'payee-b', 'payee-c'],
          options: null,
        },
        {
          op: 'notOneOf',
          field: 'payee',
          value: ['payee-a', 'payee-b', 'payee-c'],
          options: null,
        },
      ],
      actions: [],
    });
    const mappings = new Map([
      ['payee-a', 'payee-merged'],
      ['payee-b', 'payee-merged'],
    ]);

    migrateIds(rule, mappings);

    expect(rule.conditions[0].rawValue).toEqual([
      'payee-a',
      'payee-b',
      'payee-c',
    ]);
    expect(rule.conditions[0].value).toEqual(['payee-merged', 'payee-c']);
    expect(rule.conditions[0].unparsedValue).toEqual([
      'payee-merged',
      'payee-c',
    ]);
    expect(rule.conditions[1].rawValue).toEqual([
      'payee-a',
      'payee-b',
      'payee-c',
    ]);
    expect(rule.conditions[1].value).toEqual(['payee-merged', 'payee-c']);
    expect(rule.conditions[1].unparsedValue).toEqual([
      'payee-merged',
      'payee-c',
    ]);
  });
});
