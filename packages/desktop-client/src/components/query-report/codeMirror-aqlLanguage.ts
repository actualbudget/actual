import { autocompletion } from '@codemirror/autocomplete';
import type { Completion, CompletionContext } from '@codemirror/autocomplete';
import {
  HighlightStyle,
  StreamLanguage,
  syntaxHighlighting,
} from '@codemirror/language';
import type { StreamParser } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { EditorView, tooltips } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { t } from 'i18next';

const AQL_TABLES = [
  'transactions',
  'accounts',
  'categories',
  'category_groups',
  'payees',
  'budget',
];

const AQL_METHODS = [
  'filter',
  'select',
  'groupBy',
  'orderBy',
  'limit',
  'offset',
  'calculate',
  'options',
  'raw',
  'withDead',
  'reset',
  'unfilter',
];

const AQL_OPERATORS = [
  '$sum',
  '$count',
  '$sumIf',
  '$countIf',
  '$avgIf',
  '$avg',
  '$min',
  '$max',
  '$countDistinct',
  '$month',
  '$year',
  '$week',
  '$day',
  '$neg',
  '$abs',
  '$gte',
  '$lte',
  '$gt',
  '$lt',
  '$eq',
  '$ne',
  '$oneof',
  '$and',
  '$or',
  '$condition',
  '$substr',
  '$lower',
  '$upper',
];

const TRANSACTION_FIELDS: Completion[] = [
  { label: 'id', type: 'variable', section: t('Transaction Fields') },
  { label: 'account', type: 'variable', section: t('Transaction Fields') },
  { label: 'category', type: 'variable', section: t('Transaction Fields') },
  { label: 'date', type: 'variable', section: t('Transaction Fields') },
  { label: 'amount', type: 'variable', section: t('Transaction Fields') },
  { label: 'payee', type: 'variable', section: t('Transaction Fields') },
  { label: 'notes', type: 'variable', section: t('Transaction Fields') },
  { label: 'cleared', type: 'variable', section: t('Transaction Fields') },
  {
    label: 'reconciled',
    type: 'variable',
    section: t('Transaction Fields'),
  },
  { label: 'is_parent', type: 'variable', section: t('Transaction Fields') },
  { label: 'is_child', type: 'variable', section: t('Transaction Fields') },
  { label: 'parent_id', type: 'variable', section: t('Transaction Fields') },
  { label: 'sort_order', type: 'variable', section: t('Transaction Fields') },
  { label: 'transfer_id', type: 'variable', section: t('Transaction Fields') },
  {
    label: 'schedule',
    type: 'variable',
    section: t('Transaction Fields'),
  },
  { label: 'error', type: 'variable', section: t('Transaction Fields') },
  { label: 'imported_id', type: 'variable', section: t('Transaction Fields') },
  {
    label: 'imported_payee',
    type: 'variable',
    section: t('Transaction Fields'),
  },
  { label: 'start_date', type: 'variable', section: t('Transaction Fields') },
  { label: 'end_date', type: 'variable', section: t('Transaction Fields') },
];

const ACCOUNT_FIELDS: Completion[] = [
  { label: 'id', type: 'variable', section: t('Account Fields') },
  { label: 'name', type: 'variable', section: t('Account Fields') },
  { label: 'offbudget', type: 'variable', section: t('Account Fields') },
  { label: 'closed', type: 'variable', section: t('Account Fields') },
  { label: 'sort_order', type: 'variable', section: t('Account Fields') },
  {
    label: 'tombstone',
    type: 'variable',
    section: t('Account Fields'),
  },
];

const CATEGORY_FIELDS: Completion[] = [
  { label: 'id', type: 'variable', section: t('Category Fields') },
  { label: 'name', type: 'variable', section: t('Category Fields') },
  { label: 'is_income', type: 'variable', section: t('Category Fields') },
  {
    label: 'cat_group',
    type: 'variable',
    section: t('Category Fields'),
  },
  { label: 'sort_order', type: 'variable', section: t('Category Fields') },
  { label: 'tombstone', type: 'variable', section: t('Category Fields') },
  { label: 'hidden', type: 'variable', section: t('Category Fields') },
  { label: 'goal_def', type: 'variable', section: t('Category Fields') },
];

const CATEGORY_GROUP_FIELDS: Completion[] = [
  { label: 'id', type: 'variable', section: t('Category Group Fields') },
  { label: 'name', type: 'variable', section: t('Category Group Fields') },
  {
    label: 'is_income',
    type: 'variable',
    section: t('Category Group Fields'),
  },
  {
    label: 'sort_order',
    type: 'variable',
    section: t('Category Group Fields'),
  },
  { label: 'tombstone', type: 'variable', section: t('Category Group Fields') },
  { label: 'hidden', type: 'variable', section: t('Category Group Fields') },
];

const PAYEE_FIELDS: Completion[] = [
  { label: 'id', type: 'variable', section: t('Payee Fields') },
  { label: 'name', type: 'variable', section: t('Payee Fields') },
  {
    label: 'transfer_acct',
    type: 'variable',
    section: t('Payee Fields'),
  },
  { label: 'category', type: 'variable', section: t('Payee Fields') },
  { label: 'tombstone', type: 'variable', section: t('Payee Fields') },
  { label: 'favorite', type: 'variable', section: t('Payee Fields') },
  { label: 'learn_categories', type: 'variable', section: t('Payee Fields') },
];

const BUDGET_FIELDS: Completion[] = [
  { label: 'month', type: 'variable', section: t('Budget Fields') },
  { label: 'category', type: 'variable', section: t('Budget Fields') },
  { label: 'budgeted', type: 'variable', section: t('Budget Fields') },
  { label: 'spent', type: 'variable', section: t('Budget Fields') },
  { label: 'balance', type: 'variable', section: t('Budget Fields') },
  {
    label: 'carryover',
    type: 'variable',
    section: t('Budget Fields'),
  },
  { label: 'goal', type: 'variable', section: t('Budget Fields') },
  { label: 'long_goal', type: 'variable', section: t('Budget Fields') },
];

function getFieldsForTable(tableName: string): Completion[] {
  switch (tableName) {
    case 'transactions':
      return TRANSACTION_FIELDS;
    case 'accounts':
      return ACCOUNT_FIELDS;
    case 'categories':
      return CATEGORY_FIELDS;
    case 'category_groups':
      return CATEGORY_GROUP_FIELDS;
    case 'payees':
      return PAYEE_FIELDS;
    case 'budget':
      return BUDGET_FIELDS;
    default:
      return [];
  }
}

const aqlParser: StreamParser<{ inString: boolean; stringChar: string }> = {
  startState() {
    return { inString: false, stringChar: '' };
  },

  token(stream, state) {
    if (state.inString) {
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === state.stringChar) {
          state.inString = false;
          return 'string';
        }
      }
      return 'string';
    }

    if (stream.match(/^[`'"]/)) {
      state.inString = true;
      state.stringChar = stream.current().slice(-1);
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === state.stringChar) {
          state.inString = false;
          return 'string';
        }
      }
      return 'string';
    }

    if (stream.match(/^-?\d+(\.\d+)?/)) {
      return 'number';
    }

    if (stream.match(/^\$[a-zA-Z_]+/)) {
      return 'keyword';
    }

    if (stream.match(/^:[a-zA-Z_]+/)) {
      return 'typeName';
    }

    if (stream.match(/^[+\-*/=<>!,.(){}[\]:;]/)) {
      return 'operator';
    }

    if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
      const word = stream.current();
      if (word === 'q') return 'variableName.special';
      if (AQL_TABLES.includes(word)) return 'typeName';
      if (AQL_METHODS.includes(word)) return 'propertyName';
      return 'variableName';
    }

    if (stream.eatSpace()) {
      return null;
    }

    stream.next();
    return null;
  },
};

export const aqlLanguage = StreamLanguage.define(aqlParser);

function detectTableContext(doc: string, pos: number): string | null {
  const textBefore = doc.slice(0, pos);
  const match = textBefore.match(/q\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/);
  return match ? match[1] : null;
}

export function aqlAutocomplete(): Extension {
  return autocompletion({
    override: [
      (context: CompletionContext) => {
        const word = context.matchBefore(/[\w$:]*/);
        if (!word || (word.from === word.to && !context.explicit)) {
          return null;
        }

        const suggestions: Completion[] = [];

        const tableName = detectTableContext(
          context.state.doc.toString(),
          word.from,
        );

        if (tableName) {
          suggestions.push(...getFieldsForTable(tableName));
        }

        suggestions.push(
          ...AQL_TABLES.map(table => ({
            label: table,
            type: 'class',
            section: t('Tables'),
            boost: 10,
          })),
        );

        suggestions.push(
          ...AQL_METHODS.map(method => ({
            label: method,
            type: 'function',
            section: t('Methods'),
            apply: `${method}(`,
            boost: 5,
          })),
        );

        suggestions.push(
          ...AQL_OPERATORS.map(op => ({
            label: op,
            type: 'keyword',
            section: t('Operators'),
            boost: 3,
          })),
        );

        return {
          from: word.from,
          options: suggestions,
        };
      },
    ],
  });
}

const aqlHighlighting = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.keyword, color: '#0550AE' },
    { tag: tags.typeName, color: '#953800' },
    { tag: tags.propertyName, color: '#0550AE' },
    { tag: tags.special(tags.variableName), color: '#8250DF' },
    { tag: tags.string, color: '#0A3069' },
    { tag: tags.number, color: '#0550AE' },
    { tag: tags.operator, color: '#24292F' },
    { tag: tags.variableName, color: '#24292F' },
  ]),
);

const aqlHighlightingDark = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.keyword, color: '#79C0FF' },
    { tag: tags.typeName, color: '#FFA657' },
    { tag: tags.propertyName, color: '#79C0FF' },
    { tag: tags.special(tags.variableName), color: '#D2A8FF' },
    { tag: tags.string, color: '#A5D6FF' },
    { tag: tags.number, color: '#79C0FF' },
    { tag: tags.operator, color: '#C9D1D9' },
    { tag: tags.variableName, color: '#C9D1D9' },
  ]),
);

const tooltipZIndexTheme = EditorView.baseTheme({
  '.cm-tooltip': {
    zIndex: '4000 !important',
  },
  '.cm-tooltip-autocomplete': {
    zIndex: '4000 !important',
  },
});

const tooltipPortalConfig =
  typeof document === 'undefined'
    ? tooltips({ position: 'fixed' })
    : tooltips({ position: 'fixed', parent: document.body });

export function aqlLanguageExtension(isDark?: boolean): Extension[] {
  return [
    aqlLanguage,
    aqlAutocomplete(),
    isDark ? aqlHighlightingDark : aqlHighlighting,
    tooltipZIndexTheme,
    tooltipPortalConfig,
  ];
}
