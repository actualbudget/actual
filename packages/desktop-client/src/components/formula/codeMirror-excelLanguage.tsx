import React from 'react';
import { createRoot } from 'react-dom/client';
import { Trans } from 'react-i18next';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { autocompletion } from '@codemirror/autocomplete';
import type { Completion, CompletionContext } from '@codemirror/autocomplete';
import {
  HighlightStyle,
  StreamLanguage,
  syntaxHighlighting,
} from '@codemirror/language';
import type { StreamParser } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import {
  Decoration,
  EditorView,
  hoverTooltip,
  tooltips,
  ViewPlugin,
  WidgetType,
} from '@codemirror/view';
import type { DecorationSet, Tooltip, ViewUpdate } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { t } from 'i18next';

import {
  budgetQueryDimensions,
  getFormulaBadgeRanges,
} from './formulaBadgeRanges';
import type {
  BudgetCategoryBadge,
  FormulaBadgeVariant,
} from './formulaBadgeRanges';
import { queryModeFunctions } from './queryModeFunctions';
import type { FunctionDef } from './queryModeFunctions';
import { transactionModeFunctions } from './transactionModeFunctions';

// Tooltip components using the same styles as Tooltip.tsx
function FunctionTooltip({
  name,
  description,
  parameters,
}: {
  name: string;
  description: string;
  parameters: Array<{ name: string; description: string }>;
}) {
  return (
    <div style={{ maxWidth: '400px' }}>
      <div style={{ fontWeight: 600, marginBottom: '4px' }}>{name}</div>
      <div style={{ marginBottom: '8px' }}>{description}</div>
      <div style={{ fontSize: '0.9em', opacity: 0.8 }}>
        <div style={{ fontWeight: 500, marginBottom: '4px' }}>
          <Trans>Parameters:</Trans>
        </div>
        {parameters.map((p, i) => (
          <div key={i} style={{ marginBottom: '2px' }}>
            •{' '}
            <code
              style={{
                ...styles.editorPill,
                fontSize: '0.95em',
              }}
            >
              {p.name}
            </code>
            : {p.description}
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldTooltip({ label, info }: { label: string; info: string }) {
  return (
    <div style={{ maxWidth: '400px' }}>
      <div style={{ fontWeight: 600, marginBottom: '4px' }}>{label}</div>
      <div>{info}</div>
    </div>
  );
}

type FormulaMode = 'query' | 'transaction';

export type FormulaBadgeClick = {
  view: EditorView;
  anchorRect: DOMRect;
  from: number;
  to: number;
  label: string;
  variant: FormulaBadgeVariant;
  categories?: BudgetCategoryBadge[];
};

export type MonthYearFormat = 'year-month' | 'month-year';

export function parseMonthYear(
  value: string,
): { month: string; format: MonthYearFormat } | null {
  const yearMonth = value.match(/^(\d{4})-(\d{1,2})$/);
  if (yearMonth) {
    const month = Number(yearMonth[2]);
    if (month >= 1 && month <= 12) {
      return {
        month: `${yearMonth[1]}-${String(month).padStart(2, '0')}`,
        format: 'year-month',
      };
    }
  }

  const monthYear = value.match(/^(\d{1,2})-(\d{4})$/);
  if (monthYear) {
    const month = Number(monthYear[1]);
    if (month >= 1 && month <= 12) {
      return {
        month: `${monthYear[2]}-${String(month).padStart(2, '0')}`,
        format: 'month-year',
      };
    }
  }

  return null;
}

export function formatMonthYear(month: string, format: MonthYearFormat) {
  if (format === 'month-year') {
    return `${month.slice(5, 7)}-${month.slice(0, 4)}`;
  }
  return month;
}

class FormulaBadgeWidget extends WidgetType {
  constructor(
    readonly label: string,
    readonly variant: FormulaBadgeVariant,
    readonly range: { from: number; to: number },
    readonly onBadgeClick?: (details: FormulaBadgeClick) => void,
    readonly categories?: BudgetCategoryBadge[],
  ) {
    super();
  }

  eq(other: FormulaBadgeWidget) {
    return (
      other.label === this.label &&
      other.variant === this.variant &&
      other.range.from === this.range.from &&
      other.range.to === this.range.to &&
      other.onBadgeClick === this.onBadgeClick &&
      JSON.stringify(other.categories) === JSON.stringify(this.categories)
    );
  }

  toDOM(view: EditorView) {
    const element = document.createElement('span');
    const isQueryBadge = this.variant === 'query-name';
    const isBudgetBadge = this.variant.startsWith('budget-');
    const isCategoryList = this.variant === 'budget-category-list';
    element.title = this.label;
    element.style.display = 'inline-flex';
    element.style.alignItems = 'center';
    element.style.maxWidth = isCategoryList ? '100%' : '220px';
    element.style.overflow = isCategoryList ? 'visible' : 'hidden';
    element.style.textOverflow = isCategoryList ? 'clip' : 'ellipsis';
    element.style.whiteSpace = isCategoryList ? 'normal' : 'nowrap';
    element.style.padding = isCategoryList ? '2px 4px' : '0 6px';
    element.style.margin = '0 1px';
    element.style.borderRadius = isCategoryList ? '4px' : '999px';
    element.style.border = `1px solid ${theme.formInputBorder}`;
    element.style.backgroundColor = isCategoryList
      ? theme.tableRowBackgroundHover
      : isQueryBadge
        ? theme.noticeBackground
        : isBudgetBadge
          ? theme.buttonNormalBackground
          : theme.pillBackground;
    element.style.color = theme.pageText;
    element.style.fontSize = '12px';
    element.style.lineHeight = isCategoryList ? '20px' : '18px';
    if (isCategoryList) {
      element.style.gap = '4px';
      element.style.flexWrap = 'wrap';
      element.style.verticalAlign = 'middle';
      for (const category of this.categories ?? []) {
        const badge = document.createElement('span');
        badge.textContent = category.label;
        badge.title = category.label;
        badge.style.display = 'inline-flex';
        badge.style.alignItems = 'center';
        badge.style.maxWidth = '100%';
        badge.style.overflow = 'visible';
        badge.style.textOverflow = 'clip';
        badge.style.whiteSpace = 'normal';
        badge.style.overflowWrap = 'anywhere';
        badge.style.padding = '0 6px';
        badge.style.borderRadius = '999px';
        badge.style.backgroundColor = theme.buttonNormalBackground;
        badge.style.color = theme.pageText;
        badge.style.lineHeight = '18px';
        element.appendChild(badge);
      }
    } else {
      element.textContent = this.label;
    }

    if (
      this.onBadgeClick &&
      [
        'query-name',
        'budget-dimension',
        'budget-timeframe',
        'budget-category-list',
      ].includes(this.variant)
    ) {
      element.style.cursor = 'pointer';
      element.addEventListener('mousedown', event => {
        event.preventDefault();
        event.stopPropagation();
      });
      element.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        this.onBadgeClick?.({
          view,
          anchorRect: element.getBoundingClientRect(),
          from: this.range.from,
          to: this.range.to,
          label: this.label,
          variant: this.variant,
          categories: this.categories,
        });
      });
    }
    return element;
  }
}

function formulaBadgeExtension(
  mode: FormulaMode,
  queries?: Record<string, unknown>,
  variables?: Record<string, number | string>,
  onBadgeClick?: (details: FormulaBadgeClick) => void,
  categoryBadges?: Record<string, string>,
): Extension {
  const buildDecorations = (view: EditorView): DecorationSet => {
    const builder = new RangeSetBuilder<Decoration>();
    const badgeRanges = getFormulaBadgeRanges({
      formula: view.state.doc.toString(),
      mode,
      queries,
      variables,
      categoryBadges,
    });

    badgeRanges
      .filter(({ from, to }) =>
        view.visibleRanges.some(range => from < range.to && to > range.from),
      )
      .sort((a, b) => a.from - b.from || a.to - b.to)
      .forEach(({ from, to, label, variant, categories }) => {
        builder.add(
          from,
          to,
          Decoration.replace({
            widget: new FormulaBadgeWidget(
              label,
              variant,
              { from, to },
              onBadgeClick,
              categories,
            ),
            inclusive: false,
          }),
        );
      });

    return builder.finish();
  };

  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    {
      decorations: plugin => plugin.decorations,
      provide: plugin =>
        EditorView.atomicRanges.of(
          view => view.plugin(plugin)?.decorations ?? Decoration.none,
        ),
    },
  );
}

const MATH_FUNCTIONS = new Set([
  'SUM',
  'AVERAGE',
  'MAX',
  'MIN',
  'ABS',
  'ROUND',
  'ROUNDUP',
  'ROUNDDOWN',
  'CEILING',
  'FLOOR',
  'MOD',
  'POWER',
  'SQRT',
  'INT',
  'TRUNC',
  'SIGN',
  'PI',
  'SIN',
  'COS',
  'TAN',
  'LN',
  'LOG',
  'LOG10',
  'EXP',
  'PRODUCT',
  'PMT',
  'FV',
  'PV',
  'NPV',
  'IRR',
  'RATE',
]);

const LOGICAL_FUNCTIONS = new Set([
  'IF',
  'IFS',
  'AND',
  'OR',
  'XOR',
  'NOT',
  'TRUE',
  'FALSE',
  'IFERROR',
  'IFNA',
  'SWITCH',
]);

const TEXT_FUNCTIONS = new Set([
  'TEXT',
  'FIXED',
  'FORMATNUMBER',
  'FORMATCURRENCY',
  'CONCATENATE',
  'LEFT',
  'RIGHT',
  'MID',
  'LEN',
  'UPPER',
  'LOWER',
  'TRIM',
  'PROPER',
  'SUBSTITUTE',
  'REPLACE',
  'FIND',
  'SEARCH',
  'REPT',
  'CHAR',
  'CODE',
  'EXACT',
  'CLEAN',
  'SPLIT',
  'VALUE',
  'T',
  'N',
]);

const DATE_FUNCTIONS = new Set([
  'DATE',
  'YEAR',
  'MONTH',
  'DAY',
  'TODAY',
  'NOW',
  'WEEKDAY',
  'EDATE',
  'EOMONTH',
  'DAYS',
  'DATEDIF',
  'DATEVALUE',
  'NETWORKDAYS',
  'WEEKNUM',
  'ISOWEEKNUM',
]);

const QUERY_FUNCTIONS = new Set([
  'QUERY',
  'QUERY_COUNT',
  'BUDGET_QUERY',
  'QUERY_EXTRACT_CATEGORIES',
  'QUERY_EXTRACT_TIMEFRAME_START',
  'QUERY_EXTRACT_TIMEFRAME_END',
  'CHOOSE',
  'ISBLANK',
  'ISERROR',
  'ISNA',
  'ISNUMBER',
  'ISTEXT',
  'ISLOGICAL',
  'ISEVEN',
  'ISODD',
]);

// Excel formula syntax parser for CodeMirror
const excelFormulaParser: StreamParser<{ inString: boolean }> = {
  startState() {
    return { inString: false };
  },

  token(stream, state) {
    // Handle strings
    if (state.inString) {
      if (stream.skipTo('"')) {
        stream.next();
        state.inString = false;
      } else {
        stream.skipToEnd();
      }
      return 'string';
    }

    if (stream.match('"')) {
      state.inString = true;
      return 'string';
    }

    // Handle numbers
    if (stream.match(/^-?\d+(\.\d+)?/)) {
      return 'number';
    }

    // Handle operators
    if (stream.match(/^[+\-*/=<>(),:]/)) {
      return 'operator';
    }

    // Handle function names (uppercase letters followed by parenthesis)
    if (stream.match(/^[A-Z_][A-Z0-9_]*/)) {
      const word = stream.current();
      // Check if it's a function (next non-whitespace is '(')
      const pos = stream.pos;
      stream.eatSpace();
      if (stream.peek() === '(') {
        stream.pos = pos; // Reset position

        // Categorize the function using different token types
        if (MATH_FUNCTIONS.has(word)) {
          return 'keyword';
        }
        if (LOGICAL_FUNCTIONS.has(word)) {
          return 'className';
        }
        if (TEXT_FUNCTIONS.has(word)) {
          return 'namespace';
        }
        if (DATE_FUNCTIONS.has(word)) {
          return 'typeName';
        }
        if (QUERY_FUNCTIONS.has(word)) {
          return 'propertyName';
        }
        return 'function';
      }
      stream.pos = pos; // Reset position
      return 'variableName';
    }

    // Handle variable names (lowercase or mixed case)
    if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
      return 'variableName.special';
    }

    // Skip whitespace
    if (stream.eatSpace()) {
      return null;
    }

    stream.next();
    return null;
  },
};

// Transaction field variables for autocomplete
const transactionFields: Completion[] = [
  {
    label: 'amount',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Transaction amount in cents. Use for calculations and comparisons.\n\nExample: =amount / 100 to get dollar value',
    ),
  },
  {
    label: 'date',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Transaction date in YYYY-MM-DD format. Use with date functions.\n\nExample: =TEXT(date, "MMMM") to get month name',
    ),
  },
  {
    label: 'notes',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Transaction notes/memo text. Use for string operations.\n\nExample: =UPPER(notes) to convert to uppercase',
    ),
  },
  {
    label: 'imported_payee',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Original imported payee name from bank import. Contains the raw text before matching.\n\nExample: =LEFT(imported_payee, 10) to get first 10 characters',
    ),
  },
  {
    label: 'payee',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Payee ID (string). The ID of the payee.\n\nExample: =CONCATENATE("Payment to ", payee)',
    ),
  },
  {
    label: 'payee_name',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Payee name (string). The human-readable name of the payee.\n\nExample: =UPPER(payee_name) or =CONCATENATE("Payment to ", payee_name)',
    ),
  },
  {
    label: 'account',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Account ID (string). The ID of the account.\n\nExample: =CONCATENATE("Paid from ", account)',
    ),
  },
  {
    label: 'account_name',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Account name (string). The human-readable name of the account.\n\nExample: =CONCATENATE("Paid from ", account_name)',
    ),
  },
  {
    label: 'category',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Category ID (string). The ID of the category.\n\nExample: =IF(category="Groceries", "Food", "Other")',
    ),
  },
  {
    label: 'category_name',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Category Name (string). The human-readable name of the category.\n\nExample: =IF(category_name="Groceries", "Food", "Other")',
    ),
  },
  {
    label: 'cleared',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Boolean cleared status. TRUE if transaction is cleared, FALSE otherwise.\n\nExample: =IF(cleared, "Cleared", "Pending")',
    ),
  },
  {
    label: 'reconciled',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Boolean reconciled status. TRUE if transaction is reconciled, FALSE otherwise.',
    ),
  },
  {
    label: 'balance',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Account balance as of the date of the transaction, excluding the transaction amount. Use for calculations and comparisons.\n\nExample: =IF(balance < 0, "Negative Balance", "Positive Balance")',
    ),
  },
  {
    label: 'parent_amount',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'The amount of the parent transaction in cents in split transactions.\n\nExample: =(parent_amount / 100) * .05',
    ),
  },
];

// Convert function definitions to completions with grouping
function getFunctionCompletions(mode: FormulaMode): Completion[] {
  const functions =
    mode === 'query' ? queryModeFunctions : transactionModeFunctions;

  // Helper to create completion with section info
  const createCompletion = (
    name: string,
    func: FunctionDef,
    section: string,
  ): Completion => ({
    label: name,
    type: 'function',
    section,
    info: [
      func.description,
      '',
      `${t('Parameters:')} ${func.parameters.map(p => p.name).join(', ')}`,
      '',
      func.parameters.map(p => `- ${p.name}: ${p.description}`).join('\n'),
    ].join('\n'),
    apply: `${name}()`,
    boost: 10, // Boost functions to appear higher
  });

  const completions: Completion[] = [];

  // Group functions by category
  for (const [name, func] of Object.entries(functions)) {
    if (MATH_FUNCTIONS.has(name)) {
      completions.push(createCompletion(name, func, '📊 Math Functions'));
    } else if (LOGICAL_FUNCTIONS.has(name)) {
      completions.push(createCompletion(name, func, '🔀 Logical Functions'));
    } else if (TEXT_FUNCTIONS.has(name)) {
      completions.push(createCompletion(name, func, '📝 Text Functions'));
    } else if (DATE_FUNCTIONS.has(name)) {
      completions.push(createCompletion(name, func, '📅 Date Functions'));
    } else if (QUERY_FUNCTIONS.has(name)) {
      completions.push(createCompletion(name, func, '🔍 Query Functions'));
    } else {
      completions.push(createCompletion(name, func, '⚙️ Other Functions'));
    }
  }

  return completions;
}

function createContextFunctionCompletion(
  name: string,
  func: FunctionDef,
): Completion {
  return {
    label: name,
    type: 'function',
    section: 'ℹ️ Function Signature',
    detail: `(${func.parameters.map(p => p.name).join(', ')})`,
    info: [
      func.description,
      '',
      `${t('Parameters:')} ${func.parameters.map(p => p.name).join(', ')}`,
      '',
      func.parameters.map(p => `- ${p.name}: ${p.description}`).join('\n'),
    ].join('\n'),
    apply: view => {
      view.dispatch({ selection: view.state.selection });
    },
    boost: 99,
  };
}

function getActiveFunctionArgumentContext(text: string, functionName: string) {
  const stack: Array<{
    kind: 'function' | 'group' | 'array';
    name?: string;
    argumentIndex: number;
  }> = [];
  let isInString = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      isInString = !isInString;
      continue;
    }

    if (isInString) {
      continue;
    }

    if (char === '(') {
      const functionMatch = text
        .slice(0, index)
        .match(/([A-Za-z_][A-Za-z0-9_]*)\s*$/);
      stack.push({
        kind: functionMatch ? 'function' : 'group',
        name: functionMatch?.[1].toUpperCase(),
        argumentIndex: 0,
      });
      continue;
    }

    if (char === '{') {
      stack.push({ kind: 'array', argumentIndex: 0 });
      continue;
    }

    if (char === ')' || char === '}') {
      stack.pop();
      continue;
    }

    if (char === ',') {
      const activeFrame = stack.at(-1);
      if (activeFrame?.kind === 'function') {
        activeFrame.argumentIndex += 1;
      }
    }
  }

  let activeFunction: {
    kind: 'function' | 'group' | 'array';
    name?: string;
    argumentIndex: number;
  } | null = null;
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index].kind === 'function') {
      activeFunction = stack[index];
      break;
    }
  }

  return activeFunction?.name === functionName
    ? { argumentIndex: activeFunction.argumentIndex }
    : null;
}

// Autocomplete extension
export function excelFormulaAutocomplete(
  mode: FormulaMode,
  queries?: Record<string, unknown>,
  variables?: Record<string, number | string>,
  categoryBadges?: Record<string, string>,
): Extension {
  const functionCompletions = getFunctionCompletions(mode);

  const queryCompletions: Completion[] = queries
    ? Object.keys(queries).flatMap(queryName => [
        {
          label: `QUERY("${queryName}")`,
          type: 'function',
          section: '🔍 Query Functions',
          info: t('Execute the {{queryName}} query and return the result.', {
            queryName,
          }),
          apply: `QUERY("${queryName}")`,
          boost: 15, // Boost query completions to appear at top of Query Functions section
        },
        {
          label: `QUERY_COUNT("${queryName}")`,
          type: 'function',
          section: '🔍 Query Functions',
          info: t(
            'Execute the {{queryName}} query and return the number of matching rows.',
            {
              queryName,
            },
          ),
          apply: `QUERY_COUNT("${queryName}")`,
          boost: 14,
        },
        {
          label: `BUDGET_QUERY("budgeted", QUERY_EXTRACT_CATEGORIES("${queryName}"), QUERY_EXTRACT_TIMEFRAME_START("${queryName}"), QUERY_EXTRACT_TIMEFRAME_END("${queryName}"))`,
          type: 'function',
          section: '🔍 Query Functions',
          info: t(
            'Sum of budgeted amounts with extracted parameters from {{queryName}}.',
            { queryName },
          ),
          apply: `BUDGET_QUERY("budgeted", QUERY_EXTRACT_CATEGORIES("${queryName}"), QUERY_EXTRACT_TIMEFRAME_START("${queryName}"), QUERY_EXTRACT_TIMEFRAME_END("${queryName}"))`,
          boost: 13,
        },
        {
          label: `BUDGET_QUERY("spent", QUERY_EXTRACT_CATEGORIES("${queryName}"), QUERY_EXTRACT_TIMEFRAME_START("${queryName}"), QUERY_EXTRACT_TIMEFRAME_END("${queryName}"))`,
          type: 'function',
          section: '🔍 Query Functions',
          info: t(
            'Sum of spending with extracted parameters from {{queryName}}.',
            { queryName },
          ),
          apply: `BUDGET_QUERY("spent", QUERY_EXTRACT_CATEGORIES("${queryName}"), QUERY_EXTRACT_TIMEFRAME_START("${queryName}"), QUERY_EXTRACT_TIMEFRAME_END("${queryName}"))`,
          boost: 13,
        },
        {
          label: `BUDGET_QUERY("balance_start", QUERY_EXTRACT_CATEGORIES("${queryName}"), QUERY_EXTRACT_TIMEFRAME_START("${queryName}"), QUERY_EXTRACT_TIMEFRAME_END("${queryName}"))`,
          type: 'function',
          section: '🔍 Query Functions',
          info: t(
            'Opening balance with extracted parameters from {{queryName}}.',
            { queryName },
          ),
          apply: `BUDGET_QUERY("balance_start", QUERY_EXTRACT_CATEGORIES("${queryName}"), QUERY_EXTRACT_TIMEFRAME_START("${queryName}"), QUERY_EXTRACT_TIMEFRAME_END("${queryName}"))`,
          boost: 13,
        },
        {
          label: `BUDGET_QUERY("balance_end", QUERY_EXTRACT_CATEGORIES("${queryName}"), QUERY_EXTRACT_TIMEFRAME_START("${queryName}"), QUERY_EXTRACT_TIMEFRAME_END("${queryName}"))`,
          type: 'function',
          section: '🔍 Query Functions',
          info: t(
            'Closing balance with extracted parameters from {{queryName}}.',
            { queryName },
          ),
          apply: `BUDGET_QUERY("balance_end", QUERY_EXTRACT_CATEGORIES("${queryName}"), QUERY_EXTRACT_TIMEFRAME_START("${queryName}"), QUERY_EXTRACT_TIMEFRAME_END("${queryName}"))`,
          boost: 13,
        },
      ])
    : [];

  const variableCompletions: Completion[] = variables
    ? Object.entries(variables).map(([varName, value]) => ({
        label: varName,
        type: 'variable',
        section: '🔢 Variables',
        info: t('Variable with value: {{value}}', {
          value: String(value),
        }),
        boost: 20, // Boost variable completions to appear at top
      }))
    : [];

  const budgetDimensionCompletions: Completion[] =
    mode === 'query'
      ? budgetQueryDimensions.map(dimension => ({
          label: dimension,
          type: 'constant',
          section: '💸 Budget Dimensions',
          info: t('Budget query dimension.'),
          apply: `"${dimension}"`,
          boost: 18,
        }))
      : [];

  const budgetCategoryCompletions: Completion[] =
    mode === 'query' && categoryBadges
      ? Object.entries(categoryBadges).map(([categoryId, label]) => ({
          label,
          type: 'constant',
          section: '🏷️ Budget Categories',
          detail: categoryId,
          info: t('Budget category for BUDGET_QUERY category arrays.'),
          apply: `"${categoryId}"`,
          boost: 17,
        }))
      : [];

  const budgetQuerySignatureCompletion: Completion | null =
    mode === 'query' && queryModeFunctions.BUDGET_QUERY
      ? createContextFunctionCompletion(
          'BUDGET_QUERY',
          queryModeFunctions.BUDGET_QUERY,
        )
      : null;

  return autocompletion({
    override: [
      (context: CompletionContext) => {
        const word = context.matchBefore(/\w*/);
        if (!word || (word.from === word.to && !context.explicit)) {
          return null;
        }

        const budgetQueryContext =
          mode === 'query'
            ? getActiveFunctionArgumentContext(
                context.state.doc.sliceString(0, context.pos),
                'BUDGET_QUERY',
              )
            : null;

        const baseSuggestions: Completion[] = [
          ...variableCompletions, // Put variable completions first
          ...budgetDimensionCompletions,
          ...budgetCategoryCompletions,
          ...queryCompletions, // Put query completions first
          ...functionCompletions,
        ];

        const contextualSuggestions: Completion[] = budgetQueryContext
          ? [
              ...(budgetQuerySignatureCompletion
                ? [budgetQuerySignatureCompletion]
                : []),
              ...(budgetQueryContext.argumentIndex === 0
                ? budgetDimensionCompletions
                : []),
              ...(budgetQueryContext.argumentIndex === 1
                ? budgetCategoryCompletions
                : []),
              ...(budgetQueryContext.argumentIndex === 2 ||
              budgetQueryContext.argumentIndex === 3
                ? queryCompletions
                : []),
            ]
          : [];

        const suggestions: Completion[] = budgetQueryContext
          ? [
              ...contextualSuggestions,
              ...baseSuggestions.filter(
                suggestion => !contextualSuggestions.includes(suggestion),
              ),
            ]
          : baseSuggestions;

        if (mode === 'transaction') {
          suggestions.push(...transactionFields);
        }

        // Sort by section first, then by boost (descending), then by label
        const sortedSuggestions = budgetQueryContext
          ? [
              ...contextualSuggestions,
              ...suggestions
                .filter(
                  suggestion => !contextualSuggestions.includes(suggestion),
                )
                .sort((a, b) => {
                  // Define section priority order
                  const sectionOrder: Record<string, number> = {
                    'ℹ️ Function Signature': -2,
                    '🔢 Variables': -1,
                    '💸 Budget Dimensions': 0,
                    '🏷️ Budget Categories': 1,
                    '🔍 Query Functions': 2,
                    '📊 Math Functions': 3,
                    '🔀 Logical Functions': 4,
                    '📝 Text Functions': 5,
                    '📅 Date Functions': 6,
                    '⚙️ Other Functions': 7,
                    '💰 Transaction Fields': 8,
                  };

                  // Get section names
                  const sectionA =
                    typeof a.section === 'string'
                      ? a.section
                      : a.section?.name || '';
                  const sectionB =
                    typeof b.section === 'string'
                      ? b.section
                      : b.section?.name || '';

                  // Compare by section priority
                  const orderA = sectionOrder[sectionA] ?? 999;
                  const orderB = sectionOrder[sectionB] ?? 999;
                  if (orderA !== orderB) {
                    return orderA - orderB;
                  }

                  // Within same section, sort by boost (higher first)
                  const boostA = a.boost || 0;
                  const boostB = b.boost || 0;
                  if (boostA !== boostB) {
                    return boostB - boostA;
                  }

                  // Finally, sort by label alphabetically
                  return a.label.localeCompare(b.label);
                }),
            ]
          : suggestions.sort((a, b) => {
              // Define section priority order
              const sectionOrder: Record<string, number> = {
                'ℹ️ Function Signature': -2,
                '🔢 Variables': -1,
                '💸 Budget Dimensions': 0,
                '🏷️ Budget Categories': 1,
                '🔍 Query Functions': 2,
                '📊 Math Functions': 3,
                '🔀 Logical Functions': 4,
                '📝 Text Functions': 5,
                '📅 Date Functions': 6,
                '⚙️ Other Functions': 7,
                '💰 Transaction Fields': 8,
              };

              // Get section names
              const sectionA =
                typeof a.section === 'string'
                  ? a.section
                  : a.section?.name || '';
              const sectionB =
                typeof b.section === 'string'
                  ? b.section
                  : b.section?.name || '';

              // Compare by section priority
              const orderA = sectionOrder[sectionA] ?? 999;
              const orderB = sectionOrder[sectionB] ?? 999;
              if (orderA !== orderB) {
                return orderA - orderB;
              }

              // Within same section, sort by boost (higher first)
              const boostA = a.boost || 0;
              const boostB = b.boost || 0;
              if (boostA !== boostB) {
                return boostB - boostA;
              }

              // Finally, sort by label alphabetically
              return a.label.localeCompare(b.label);
            });

        return {
          from: word.from,
          options: sortedSuggestions,
        };
      },
    ],
  });
}

// Hover tooltip for documentation
export function excelFormulaHover(mode: FormulaMode): Extension {
  const functions =
    mode === 'query' ? queryModeFunctions : transactionModeFunctions;

  return hoverTooltip((view, pos) => {
    const word = view.state.wordAt(pos);
    if (!word) return null;
    const w = view.state.doc.sliceString(word.from, word.to);
    const upper = w.toUpperCase();
    const funcDef = functions[upper];
    if (funcDef) {
      return {
        pos: word.from,
        end: word.to,
        above: true,
        create() {
          const dom = document.createElement('div');
          dom.className = 'cm-tooltip-hover';
          Object.assign(dom.style, styles.tooltip, { padding: '8px' });
          const root = createRoot(dom);
          root.render(
            <FunctionTooltip
              name={upper}
              description={funcDef.description}
              parameters={funcDef.parameters}
            />,
          );
          return {
            dom,
            destroy() {
              root.unmount();
            },
          };
        },
      } satisfies Tooltip;
    }

    // Transaction fields
    if (mode === 'transaction') {
      const field = transactionFields.find(f => f.label === w);
      if (field) {
        return {
          pos: word.from,
          end: word.to,
          above: true,
          create() {
            const dom = document.createElement('div');
            dom.className = 'cm-tooltip-hover';
            Object.assign(dom.style, styles.tooltip, { padding: '8px' });
            const root = createRoot(dom);
            const infoText = typeof field.info === 'string' ? field.info : '';
            root.render(<FieldTooltip label={field.label} info={infoText} />);
            return {
              dom,
              destroy() {
                root.unmount();
              },
            };
          },
        } satisfies Tooltip;
      }
    }

    return null;
  });
}

// Excel formula language support
export const excelFormulaLanguage = StreamLanguage.define(excelFormulaParser);

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

const autocompletePopoverTheme = EditorView.baseTheme({
  // Wrapper: keep transparent; the list and info panel are the actual "cards".
  '.cm-tooltip.cm-tooltip-autocomplete': {
    ...styles.darkScrollbar,
    backgroundColor: 'transparent',
    border: 'none',
    boxShadow: 'none',
    padding: 0,
    margin: '6px',
    overflow: 'visible',
    fontFamily: 'inherit',
    userSelect: 'none',
  },

  // The suggestion list card
  '.cm-tooltip.cm-tooltip-autocomplete > ul': {
    ...styles.shadowLarge,
    margin: 0,
    padding: '5px 0',
    maxHeight: '260px',
    minWidth: '280px',
    listStyle: 'none',
    backgroundColor: theme.menuAutoCompleteBackground,
    color: theme.menuAutoCompleteText,
    borderRadius: '6px',
    overflow: 'hidden',
    overflowY: 'auto',
  },

  // Hide CodeMirror's leading icons (gear / f / etc.)
  '.cm-tooltip.cm-tooltip-autocomplete .cm-completionIcon': {
    display: 'none !important',
    width: 0,
    margin: 0,
    padding: 0,
  },
  '.cm-tooltip.cm-tooltip-autocomplete .cm-completionIcon::before': {
    display: 'none !important',
  },

  // Section headers
  '.cm-tooltip.cm-tooltip-autocomplete > ul > completion-section, .cm-tooltip.cm-tooltip-autocomplete li.cm-completionSection':
    {
      padding: '7px 12px 3px !important',
      paddingLeft: '12px !important',
      paddingRight: '12px !important',
      fontSize: '11px',
      lineHeight: '1em',
      textTransform: 'uppercase',
      letterSpacing: '0.03em',
      color: theme.menuItemTextHeader,
      opacity: '1 !important',
      marginTop: '8px',
      position: 'sticky',
      top: 0,
      backgroundColor: theme.menuAutoCompleteBackground,
      borderTop: 'none !important',
      borderBottom: 'none !important',
      zIndex: 1,
    },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > completion-section:first-child, .cm-tooltip.cm-tooltip-autocomplete li.cm-completionSection:first-child':
    {
      marginTop: 0,
    },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > completion-section::before, .cm-tooltip.cm-tooltip-autocomplete > ul > completion-section::after, .cm-tooltip.cm-tooltip-autocomplete li.cm-completionSection::before, .cm-tooltip.cm-tooltip-autocomplete li.cm-completionSection::after':
    {
      display: 'none !important',
    },
  // Completion rows
  '.cm-tooltip.cm-tooltip-autocomplete li.cm-completionItem, .cm-tooltip.cm-tooltip-autocomplete li[role="option"]':
    {
      padding: '5px 14px !important',
      paddingLeft: '14px !important',
      paddingRight: '14px !important',
      lineHeight: '1.2',
      cursor: 'default',
      display: 'flex',
      alignItems: 'baseline',
      gap: '8px',
      borderRadius: 0,
    },

  '.cm-tooltip.cm-tooltip-autocomplete li.cm-completionItem': {
    lineHeight: '1.2',
    cursor: 'default',
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    borderRadius: 0,
  },

  '.cm-tooltip.cm-tooltip-autocomplete li.cm-completionItem[aria-selected], .cm-tooltip.cm-tooltip-autocomplete li.cm-completionItem:hover, .cm-tooltip.cm-tooltip-autocomplete li.cm-completionItem-hover':
    {
      backgroundColor: theme.menuAutoCompleteBackgroundHover,
      color: theme.menuAutoCompleteItemTextHover,
    },
  '.cm-tooltip.cm-tooltip-autocomplete li[role="option"]:hover': {
    backgroundColor: theme.menuAutoCompleteBackgroundHover,
    color: theme.menuAutoCompleteItemTextHover,
  },

  // Matched text within a label
  '.cm-tooltip.cm-tooltip-autocomplete .cm-completionMatchedText': {
    fontWeight: '600',
    textDecoration: 'underline',
    textUnderlineOffset: '2px',
  },

  // Label + detail formatting
  '.cm-tooltip.cm-tooltip-autocomplete .cm-completionLabel': {
    fontSize: '13px',
    flex: '1 1 auto',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  '.cm-tooltip.cm-tooltip-autocomplete .cm-completionDetail': {
    fontSize: '12px',
    color: theme.menuKeybindingText,
    marginLeft: 'auto',
    whiteSpace: 'nowrap',
  },
  '.cm-tooltip.cm-tooltip-autocomplete li.cm-completionItem[aria-selected] .cm-completionDetail':
    {
      color: theme.menuAutoCompleteItemTextHover,
    },

  // Docs panel for selected completion
  '.cm-tooltip.cm-tooltip-autocomplete .cm-completionInfo': {
    backgroundColor: theme.menuBackground,
    color: theme.pageText,
    padding: '12px 14px',
    maxWidth: '360px',
    whiteSpace: 'pre-wrap',
    fontSize: '12px',
    lineHeight: '1.4',
    ...styles.shadowLarge,
    border: 'none',
    borderRadius: '6px',
    marginLeft: '8px',
  },
});

//hack: this is a workaround to forward the pointer events to the completion item.
//isPointInsideRect / findAutocompleteElementAtPoint / autocompletePopoverPointerHandler are needed to forward the pointer events to the completion item.
//Otherwise the mouse interactions will not work as expected.
function isPointInsideRect(x: number, y: number, rect: DOMRect) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function findAutocompleteElementAtPoint(
  document: Document,
  selector: string,
  x: number,
  y: number,
) {
  return Array.from(document.querySelectorAll(selector)).find(element =>
    isPointInsideRect(x, y, element.getBoundingClientRect()),
  );
}

const autocompletePopoverPointerHandler = ViewPlugin.define(view => {
  let hoveredCompletionItem: HTMLElement | null = null;

  function setHoveredCompletionItem(completionItem: HTMLElement | null) {
    if (hoveredCompletionItem === completionItem) {
      return;
    }

    hoveredCompletionItem?.classList.remove('cm-completionItem-hover');
    hoveredCompletionItem = completionItem;
    hoveredCompletionItem?.classList.add('cm-completionItem-hover');
  }

  const handleWheel = (event: WheelEvent) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    let scrollContainer: Element | null | undefined = event.target.closest(
      '.cm-tooltip.cm-tooltip-autocomplete > ul',
    );
    if (!(scrollContainer instanceof HTMLElement)) {
      // React Aria modals use the browser top layer, so wheel events can target
      // modal content even when the autocomplete list is visually under the pointer.
      scrollContainer = findAutocompleteElementAtPoint(
        view.dom.ownerDocument,
        '.cm-tooltip.cm-tooltip-autocomplete > ul',
        event.clientX,
        event.clientY,
      );
    }

    if (!(scrollContainer instanceof HTMLElement)) {
      return;
    }

    const canScrollY =
      scrollContainer.scrollHeight > scrollContainer.clientHeight;
    const canScrollX =
      scrollContainer.scrollWidth > scrollContainer.clientWidth;
    if (!canScrollY && !canScrollX) {
      return;
    }

    const deltaMultiplier =
      event.deltaMode === WheelEvent.DOM_DELTA_LINE
        ? 16
        : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
          ? scrollContainer.clientHeight
          : 1;

    const previousScrollTop = scrollContainer.scrollTop;
    const previousScrollLeft = scrollContainer.scrollLeft;

    scrollContainer.scrollTop += event.deltaY * deltaMultiplier;
    scrollContainer.scrollLeft += event.deltaX * deltaMultiplier;

    if (
      scrollContainer.scrollTop !== previousScrollTop ||
      scrollContainer.scrollLeft !== previousScrollLeft
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const handleMouseDown = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    if (event.target.closest('.cm-tooltip.cm-tooltip-autocomplete')) {
      return;
    }

    const completionItem = findAutocompleteElementAtPoint(
      view.dom.ownerDocument,
      '.cm-tooltip.cm-tooltip-autocomplete li[role="option"], .cm-tooltip.cm-tooltip-autocomplete li.cm-completionItem',
      event.clientX,
      event.clientY,
    );

    if (!(completionItem instanceof HTMLElement)) {
      setHoveredCompletionItem(null);
      return;
    }

    setHoveredCompletionItem(completionItem);

    completionItem.dispatchEvent(
      new MouseEvent(event.type, {
        bubbles: true,
        cancelable: true,
        view: view.dom.ownerDocument.defaultView,
        clientX: event.clientX,
        clientY: event.clientY,
        screenX: event.screenX,
        screenY: event.screenY,
        button: event.button,
        buttons: event.buttons,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      }),
    );
    event.preventDefault();
    event.stopPropagation();
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) {
      return;
    }

    if (event.target.closest('.cm-tooltip.cm-tooltip-autocomplete')) {
      return;
    }

    const completionItem = findAutocompleteElementAtPoint(
      view.dom.ownerDocument,
      '.cm-tooltip.cm-tooltip-autocomplete li[role="option"], .cm-tooltip.cm-tooltip-autocomplete li.cm-completionItem',
      event.clientX,
      event.clientY,
    );

    if (!(completionItem instanceof HTMLElement)) {
      return;
    }

    completionItem.dispatchEvent(
      new MouseEvent(event.type, {
        bubbles: true,
        cancelable: true,
        view: view.dom.ownerDocument.defaultView,
        clientX: event.clientX,
        clientY: event.clientY,
        screenX: event.screenX,
        screenY: event.screenY,
        button: event.button,
        buttons: event.buttons,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      }),
    );
  };

  view.dom.ownerDocument.addEventListener('wheel', handleWheel, {
    capture: true,
    passive: false,
  });
  view.dom.ownerDocument.addEventListener('mousedown', handleMouseDown, {
    capture: true,
    passive: false,
  });
  view.dom.ownerDocument.addEventListener('mousemove', handleMouseMove, {
    capture: true,
    passive: true,
  });

  return {
    destroy() {
      view.dom.ownerDocument.removeEventListener('wheel', handleWheel, {
        capture: true,
      });
      view.dom.ownerDocument.removeEventListener('mousedown', handleMouseDown, {
        capture: true,
      });
      view.dom.ownerDocument.removeEventListener('mousemove', handleMouseMove, {
        capture: true,
      });
      setHoveredCompletionItem(null);
    },
  };
});

// Custom theme for categorized function highlighting (light)
const functionCategoryTheme = EditorView.baseTheme({
  '&light .cm-keyword': { color: '#0066CC' }, // Math functions in blue
  '&light .cm-className': { color: '#267F99' }, // Logical functions in teal
  '&light .cm-namespace': { color: '#AF00DB' }, // Text functions in purple
  '&light .cm-typeName': { color: '#098658' }, // Date functions in green
  '&light .cm-propertyName': { color: '#D73A49' }, // Query functions in red
});

// Syntax highlighting for Excel formulas
export const excelFormulaHighlighting = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.function(tags.variableName), color: '#795E26' }, // Generic functions in brown/gold
    // Other syntax elements
    { tag: tags.string, color: '#A31515' }, // Strings in red
    { tag: tags.number, color: '#098658' }, // Numbers in green
    { tag: tags.operator, color: '#000000' }, // Operators in black
    { tag: tags.variableName, color: '#001080' }, // Variables in dark blue
    { tag: tags.special(tags.variableName), color: '#0070C1' }, // Special variables (transaction fields) in bright blue
  ]),
);

// Custom theme for categorized function highlighting (dark)
const functionCategoryThemeDark = EditorView.baseTheme({
  '&dark .cm-keyword': { color: '#4FC1FF' }, // Math functions in bright cyan
  '&dark .cm-className': { color: '#4EC9B0' }, // Logical functions in teal
  '&dark .cm-namespace': { color: '#C586C0' }, // Text functions in light purple
  '&dark .cm-typeName': { color: '#B5CEA8' }, // Date functions in light green
  '&dark .cm-propertyName': { color: '#F97583' }, // Query functions in light red
});

// Dark theme syntax highlighting
export const excelFormulaDarkHighlighting = syntaxHighlighting(
  HighlightStyle.define([
    { tag: tags.function(tags.variableName), color: '#DCDCAA' }, // Generic functions in light yellow
    // Other syntax elements
    { tag: tags.string, color: '#CE9178' }, // Strings in orange
    { tag: tags.number, color: '#B5CEA8' }, // Numbers in light green
    { tag: tags.operator, color: '#D4D4D4' }, // Operators in light gray
    { tag: tags.variableName, color: '#9CDCFE' }, // Variables in light blue
    { tag: tags.special(tags.variableName), color: '#4FC1FF' }, // Special variables in bright cyan
  ]),
);

// Combined extension for Excel formula support
export function excelFormulaExtension(
  mode: FormulaMode,
  queries?: Record<string, unknown>,
  isDark?: boolean,
  variables?: Record<string, number | string>,
  onBadgeClick?: (details: FormulaBadgeClick) => void,
  categoryBadges?: Record<string, string>,
): Extension[] {
  return [
    excelFormulaLanguage,
    excelFormulaAutocomplete(mode, queries, variables, categoryBadges),
    excelFormulaHover(mode),
    formulaBadgeExtension(
      mode,
      queries,
      variables,
      onBadgeClick,
      categoryBadges,
    ),
    isDark ? excelFormulaDarkHighlighting : excelFormulaHighlighting,
    isDark ? functionCategoryThemeDark : functionCategoryTheme,
    tooltipZIndexTheme,
    tooltipPortalConfig,
    autocompletePopoverTheme,
    autocompletePopoverPointerHandler,
  ];
}
