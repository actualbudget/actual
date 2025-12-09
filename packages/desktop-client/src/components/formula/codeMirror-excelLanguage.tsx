/* eslint-disable actual/typography */
import React from 'react';

import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import {
  autocompletion,
  type Completion,
  type CompletionContext,
} from '@codemirror/autocomplete';
import {
  syntaxHighlighting,
  HighlightStyle,
  StreamLanguage,
  type StreamParser,
} from '@codemirror/language';
import { type Extension } from '@codemirror/state';
import { hoverTooltip, type Tooltip, EditorView } from '@codemirror/view';
import { tags } from '@lezer/highlight';
import { t } from 'i18next';
import { createRoot } from 'react-dom/client';

import { queryModeFunctions, type FunctionDef } from './queryModeFunctions';
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
        <div style={{ fontWeight: 500, marginBottom: '4px' }}>Parameters:</div>
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

// Function categories for different syntax highlighting
const MATH_FUNCTIONS = new Set([
  'SUM',
  'AVERAGE',
  'AVERAGEA',
  'COUNT',
  'COUNTA',
  'COUNTBLANK',
  'COUNTIF',
  'COUNTIFS',
  'MAX',
  'MAXA',
  'MIN',
  'MINA',
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
  'SUMIF',
  'SUMIFS',
  'SUMPRODUCT',
  'SUMSQ',
  'MEDIAN',
  'MODE',
  'STDEV',
  'STDEVP',
  'VAR',
  'VARP',
  'PERCENTILE',
  'QUARTILE',
  'RANK',
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
  'LOOKUP',
  'VLOOKUP',
  'HLOOKUP',
  'INDEX',
  'MATCH',
  'CHOOSE',
  'ISBLANK',
  'ISERROR',
  'ISNA',
  'ISNUMBER',
  'ISTEXT',
  'ISLOGICAL',
  'ISREF',
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
      'Transaction amount in cents. Use for calculations and comparisons.\n\nExample: `=amount / 100` to get dollar value',
    ),
  },
  {
    label: 'date',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Transaction date in YYYY-MM-DD format. Use with date functions.\n\nExample: `=TEXT(date, "MMMM")` to get month name',
    ),
  },
  {
    label: 'notes',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Transaction notes/memo text. Use for string operations.\n\nExample: `=UPPER(notes)` to convert to uppercase',
    ),
  },
  {
    label: 'imported_payee',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Original imported payee name from bank import. Contains the raw text before matching.\n\nExample: `=LEFT(imported_payee, 10)` to get first 10 characters',
    ),
  },
  {
    label: 'payee',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Payee ID (string). The ID of the payee.\n\nExample: `=CONCATENATE("Payment to ", payee)`',
    ),
  },
  {
    label: 'payee_name',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Payee name (string). The human-readable name of the payee.\n\nExample: `=UPPER(payee_name)` or `=CONCATENATE("Payment to ", payee_name)`',
    ),
  },
  {
    label: 'account',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Account ID (string). The ID of the account.\n\nExample: `=CONCATENATE("Paid from ", account)`',
    ),
  },
  {
    label: 'account_name',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Account name (string). The human-readable name of the account.\n\nExample: `=CONCATENATE("Paid from ", account_name)`',
    ),
  },
  {
    label: 'category',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Category ID (string). The ID of the category.\n\nExample: `=IF(category="Groceries", "Food", "Other")`',
    ),
  },
  {
    label: 'category_name',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Category Name (string). The human-readable name of the category.\n\nExample: `=IF(category_name="Groceries", "Food", "Other")`',
    ),
  },
  {
    label: 'cleared',
    type: 'variable',
    section: '💰 Transaction Fields',
    boost: 5,
    info: t(
      'Boolean cleared status. TRUE if transaction is cleared, FALSE otherwise.\n\nExample: `=IF(cleared, "Cleared", "Pending")`',
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
      'Account balance as of the date of the transaction, excluding the transaction amount. Use for calculations and comparisons.\n\nExample: `=IF(balance < 0, "Negative Balance", "Positive Balance")`',
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
    info: `${func.description}\n\nParameters: ${func.parameters.map(p => p.name).join(', ')}\n\n${func.parameters.map(p => `- ${p.name}: ${p.description}`).join('\n')}`,
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

// Autocomplete extension
export function excelFormulaAutocomplete(
  mode: FormulaMode,
  queries?: Record<string, unknown>,
  variables?: Record<string, number | string>,
): Extension {
  const functionCompletions = getFunctionCompletions(mode);

  const queryCompletions: Completion[] = queries
    ? Object.keys(queries).map(queryName => ({
        label: `QUERY("${queryName}")`,
        type: 'function',
        section: '🔍 Query Functions',
        info: t('Execute the {{queryName}} query and return the result.', {
          queryName,
        }),
        apply: `QUERY("${queryName}")`,
        boost: 15, // Boost query completions to appear at top of Query Functions section
      }))
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

  return autocompletion({
    override: [
      (context: CompletionContext) => {
        const word = context.matchBefore(/\w*/);
        if (!word || (word.from === word.to && !context.explicit)) {
          return null;
        }

        const suggestions: Completion[] = [
          ...variableCompletions, // Put variable completions first
          ...queryCompletions, // Put query completions first
          ...functionCompletions,
        ];

        if (mode === 'transaction') {
          suggestions.push(...transactionFields);
        }

        // Sort by section first, then by boost (descending), then by label
        const sortedSuggestions = suggestions.sort((a, b) => {
          // Define section priority order
          const sectionOrder: Record<string, number> = {
            '🔢 Variables': -1,
            '🔍 Query Functions': 0,
            '📊 Math Functions': 1,
            '🔀 Logical Functions': 2,
            '📝 Text Functions': 3,
            '📅 Date Functions': 4,
            '⚙️ Other Functions': 5,
            '💰 Transaction Fields': 6,
          };

          // Get section names
          const sectionA =
            typeof a.section === 'string' ? a.section : a.section?.name || '';
          const sectionB =
            typeof b.section === 'string' ? b.section : b.section?.name || '';

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
          Object.assign(dom.style, {
            padding: '8px',
            boxShadow:
              '0 15px 30px 0 rgba(0,0,0,0.11), 0 5px 15px 0 rgba(0,0,0,0.08)',
            borderWidth: '2px',
            borderRadius: '4px',
            borderStyle: 'solid',
            borderColor: theme.tooltipBorder,
            backgroundColor: theme.tooltipBackground,
            color: theme.tooltipText,
            overflow: 'auto',
          });
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
            Object.assign(dom.style, {
              padding: '8px',
              boxShadow:
                '0 15px 30px 0 rgba(0,0,0,0.11), 0 5px 15px 0 rgba(0,0,0,0.08)',
              borderWidth: '2px',
              borderRadius: '4px',
              borderStyle: 'solid',
              borderColor: theme.tooltipBorder,
              backgroundColor: theme.tooltipBackground,
              color: theme.tooltipText,
              overflow: 'auto',
            });
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
): Extension[] {
  return [
    excelFormulaLanguage,
    excelFormulaAutocomplete(mode, queries, variables),
    excelFormulaHover(mode),
    isDark ? excelFormulaDarkHighlighting : excelFormulaHighlighting,
    isDark ? functionCategoryThemeDark : functionCategoryTheme,
  ];
}
