import type { Completion } from '@codemirror/autocomplete';
import { t } from 'i18next';

export type FormulaMode = 'query' | 'transaction';

export type FormulaFunctionCategory =
  | 'math'
  | 'logical'
  | 'text'
  | 'date'
  | 'query'
  | 'other';

export type FormulaFunctionDef = {
  name: string;
  category: FormulaFunctionCategory;
  modes: FormulaMode[];
  description: string;
  parameters: Array<{ name: string; description: string }>;
};

export const budgetQueryDimensions = [
  'budgeted',
  'spent',
  'balance_start',
  'balance_end',
  'goal',
] as const;

type FormulaFunctionCategoryConfig = {
  section: string;
  order: number;
  tokenClass:
    | 'keyword'
    | 'className'
    | 'namespace'
    | 'typeName'
    | 'propertyName'
    | 'function';
};

export function getFormulaFunctionCategoryConfig(): Record<
  FormulaFunctionCategory,
  FormulaFunctionCategoryConfig
> {
  return {
    query: {
      section: `🔍 ${t('Query Functions')}`,
      order: 0,
      tokenClass: 'propertyName',
    },
    math: {
      section: `📊 ${t('Math Functions')}`,
      order: 1,
      tokenClass: 'keyword',
    },
    logical: {
      section: `🔀 ${t('Logical Functions')}`,
      order: 2,
      tokenClass: 'className',
    },
    text: {
      section: `📝 ${t('Text Functions')}`,
      order: 3,
      tokenClass: 'namespace',
    },
    date: {
      section: `📅 ${t('Date Functions')}`,
      order: 4,
      tokenClass: 'typeName',
    },
    other: {
      section: `⚙️ ${t('Other Functions')}`,
      order: 5,
      tokenClass: 'function',
    },
  };
}

function getVariableCompletionSection(): string {
  return `🔢 ${t('Variables')}`;
}

export function getFunctionSignatureCompletionSection(): string {
  return `ℹ️ ${t('Function Signature')}`;
}

export function getBudgetDimensionCompletionSection(): string {
  return `💸 ${t('Budget Dimensions')}`;
}

export function getBudgetCategoryCompletionSection(): string {
  return `🏷️ ${t('Budget Categories')}`;
}

function getRuleFieldCompletionSection(): string {
  return `💰 ${t('Transaction Fields')}`;
}

function getFormulaCompletionSectionOrder(): Record<string, number> {
  const categoryConfig = getFormulaFunctionCategoryConfig();

  return {
    [getFunctionSignatureCompletionSection()]: -2,
    [getVariableCompletionSection()]: -1,
    [categoryConfig.query.section]: categoryConfig.query.order,
    [categoryConfig.math.section]: categoryConfig.math.order,
    [categoryConfig.logical.section]: categoryConfig.logical.order,
    [categoryConfig.text.section]: categoryConfig.text.order,
    [categoryConfig.date.section]: categoryConfig.date.order,
    [categoryConfig.other.section]: categoryConfig.other.order,
    [getBudgetDimensionCompletionSection()]: 6,
    [getBudgetCategoryCompletionSection()]: 7,
    [getRuleFieldCompletionSection()]: 8,
  };
}

export function getFormulaFunctionCatalog(): Record<
  string,
  FormulaFunctionDef
> {
  return {
    SUM: {
      name: 'SUM',
      category: 'math',
      modes: ['query', 'transaction'],
      description: t('Returns the sum of all numbers in a range.'),
      parameters: [{ name: 'numbers', description: t('One or more numbers') }],
    },
    AVERAGE: {
      name: 'AVERAGE',
      category: 'math',
      modes: ['query'],
      description: t('Returns the average of all numbers in a range.'),
      parameters: [{ name: 'numbers', description: t('One or more numbers') }],
    },
    MAX: {
      name: 'MAX',
      category: 'math',
      modes: ['query'],
      description: t('Returns the maximum value from numbers.'),
      parameters: [{ name: 'numbers', description: t('One or more numbers') }],
    },
    MIN: {
      name: 'MIN',
      category: 'math',
      modes: ['query'],
      description: t('Returns the minimum value from numbers.'),
      parameters: [{ name: 'numbers', description: t('One or more numbers') }],
    },
    ABS: {
      name: 'ABS',
      category: 'math',
      modes: ['query', 'transaction'],
      description: t('Returns the absolute value of a number.'),
      parameters: [{ name: 'number', description: t('Number') }],
    },
    ROUND: {
      name: 'ROUND',
      category: 'math',
      modes: ['query', 'transaction'],
      description: t('Rounds a number to specified decimals.'),
      parameters: [
        { name: 'number', description: t('Number') },
        { name: 'decimals', description: t('Decimals') },
      ],
    },
    ROUNDDOWN: {
      name: 'ROUNDDOWN',
      category: 'math',
      modes: ['query', 'transaction'],
      description: t('Rounds down to specified decimals.'),
      parameters: [
        { name: 'number', description: t('Number') },
        { name: 'decimals', description: t('Decimals') },
      ],
    },
    ROUNDUP: {
      name: 'ROUNDUP',
      category: 'math',
      modes: ['query', 'transaction'],
      description: t('Rounds up to specified decimals.'),
      parameters: [
        { name: 'number', description: t('Number') },
        { name: 'decimals', description: t('Decimals') },
      ],
    },
    BUDGET_QUERY: {
      name: 'BUDGET_QUERY',
      category: 'query',
      modes: ['query'],
      description: t(
        'Evaluate a budget query using extracted parameters. Supply dimension, categories, and timeframe explicitly.',
      ),
      parameters: [
        {
          name: 'dimension',
          description: t(
            'One of: budgeted, spent, balance_start, balance_end, goal (string)',
          ),
        },
        {
          name: 'categories',
          description: t(
            'Categories result from QUERY_EXTRACT_CATEGORIES() (array)',
          ),
        },
        {
          name: 'timeframe_start',
          description: t(
            'Start month from QUERY_EXTRACT_TIMEFRAME_START() (string)',
          ),
        },
        {
          name: 'timeframe_end',
          description: t(
            'End month from QUERY_EXTRACT_TIMEFRAME_END() (string)',
          ),
        },
      ],
    },
    QUERY_EXTRACT_CATEGORIES: {
      name: 'QUERY_EXTRACT_CATEGORIES',
      category: 'query',
      modes: ['query'],
      description: t('Extract category IDs from a named query.'),
      parameters: [
        {
          name: 'queryName',
          description: t('Name of the saved query (string)'),
        },
      ],
    },
    QUERY_EXTRACT_TIMEFRAME_START: {
      name: 'QUERY_EXTRACT_TIMEFRAME_START',
      category: 'query',
      modes: ['query'],
      description: t('Extract the start month from a named query timeframe.'),
      parameters: [
        {
          name: 'queryName',
          description: t('Name of the saved query (string)'),
        },
      ],
    },
    QUERY_EXTRACT_TIMEFRAME_END: {
      name: 'QUERY_EXTRACT_TIMEFRAME_END',
      category: 'query',
      modes: ['query'],
      description: t('Extract the end month from a named query timeframe.'),
      parameters: [
        {
          name: 'queryName',
          description: t('Name of the saved query (string)'),
        },
      ],
    },
    FLOOR: {
      name: 'FLOOR',
      category: 'math',
      modes: ['query', 'transaction'],
      description: t('Rounds down to nearest multiple of significance.'),
      parameters: [
        { name: 'number', description: t('Number') },
        { name: 'significance', description: t('Significance') },
      ],
    },
    CEILING: {
      name: 'CEILING',
      category: 'math',
      modes: ['query', 'transaction'],
      description: t('Rounds up to nearest multiple of significance.'),
      parameters: [
        { name: 'number', description: t('Number') },
        { name: 'significance', description: t('Significance') },
      ],
    },
    POWER: {
      name: 'POWER',
      category: 'math',
      modes: ['query', 'transaction'],
      description: t('Returns base raised to the power of exponent.'),
      parameters: [
        { name: 'base', description: t('Base') },
        { name: 'exponent', description: t('Exponent') },
      ],
    },
    SQRT: {
      name: 'SQRT',
      category: 'math',
      modes: ['query', 'transaction'],
      description: t('Returns the square root.'),
      parameters: [{ name: 'number', description: t('Number') }],
    },
    MOD: {
      name: 'MOD',
      category: 'math',
      modes: ['query', 'transaction'],
      description: t('Returns the remainder of division.'),
      parameters: [
        { name: 'dividend', description: t('Dividend') },
        { name: 'divisor', description: t('Divisor') },
      ],
    },
    PI: {
      name: 'PI',
      category: 'math',
      modes: ['query'],
      description: t('Returns the value of PI.'),
      parameters: [],
    },
    SIN: {
      name: 'SIN',
      category: 'math',
      modes: ['query'],
      description: t('Returns the sine of an angle.'),
      parameters: [{ name: 'angle', description: t('Angle') }],
    },
    COS: {
      name: 'COS',
      category: 'math',
      modes: ['query'],
      description: t('Returns the cosine of an angle.'),
      parameters: [{ name: 'angle', description: t('Angle') }],
    },
    TAN: {
      name: 'TAN',
      category: 'math',
      modes: ['query'],
      description: t('Returns the tangent of an angle.'),
      parameters: [{ name: 'angle', description: t('Angle') }],
    },
    LN: {
      name: 'LN',
      category: 'math',
      modes: ['query'],
      description: t('Returns the natural logarithm.'),
      parameters: [{ name: 'number', description: t('Number') }],
    },
    LOG: {
      name: 'LOG',
      category: 'math',
      modes: ['query'],
      description: t('Returns the logarithm to specified base.'),
      parameters: [
        { name: 'number', description: t('Number') },
        { name: 'base', description: t('Base') },
      ],
    },
    LOG10: {
      name: 'LOG10',
      category: 'math',
      modes: ['query'],
      description: t('Returns the base-10 logarithm.'),
      parameters: [{ name: 'number', description: t('Number') }],
    },
    EXP: {
      name: 'EXP',
      category: 'math',
      modes: ['query'],
      description: t('Returns e raised to the power of number.'),
      parameters: [{ name: 'number', description: t('Number') }],
    },
    PRODUCT: {
      name: 'PRODUCT',
      category: 'math',
      modes: ['query'],
      description: t('Returns the product of all numbers.'),
      parameters: [{ name: 'numbers', description: t('One or more numbers') }],
    },
    IF: {
      name: 'IF',
      category: 'logical',
      modes: ['query', 'transaction'],
      description: t(
        'Returns one value if condition is TRUE, another if FALSE.',
      ),
      parameters: [
        { name: 'condition', description: t('Condition') },
        { name: 'value_if_true', description: t('Value to return when true') },
        {
          name: 'value_if_false',
          description: t('Value to return when false'),
        },
      ],
    },
    IFS: {
      name: 'IFS',
      category: 'logical',
      modes: ['query', 'transaction'],
      description: t(
        'Checks multiple conditions and returns corresponding values.',
      ),
      parameters: [
        { name: 'condition1', description: t('First condition') },
        { name: 'value1', description: t('First value') },
      ],
    },
    AND: {
      name: 'AND',
      category: 'logical',
      modes: ['query', 'transaction'],
      description: t('Returns TRUE if all arguments are TRUE.'),
      parameters: [
        {
          name: 'conditions',
          description: t('One or more conditions'),
        },
      ],
    },
    OR: {
      name: 'OR',
      category: 'logical',
      modes: ['query', 'transaction'],
      description: t('Returns TRUE if any argument is TRUE.'),
      parameters: [
        {
          name: 'conditions',
          description: t('One or more conditions'),
        },
      ],
    },
    XOR: {
      name: 'XOR',
      category: 'logical',
      modes: ['query', 'transaction'],
      description: t('Returns TRUE if odd number of arguments are TRUE.'),
      parameters: [
        {
          name: 'conditions',
          description: t('One or more conditions'),
        },
      ],
    },
    NOT: {
      name: 'NOT',
      category: 'logical',
      modes: ['query', 'transaction'],
      description: t('Reverses the logical value.'),
      parameters: [{ name: 'condition', description: t('Condition') }],
    },
    TRUE: {
      name: 'TRUE',
      category: 'logical',
      modes: ['query', 'transaction'],
      description: t('Returns the logical value TRUE.'),
      parameters: [],
    },
    FALSE: {
      name: 'FALSE',
      category: 'logical',
      modes: ['query', 'transaction'],
      description: t('Returns the logical value FALSE.'),
      parameters: [],
    },
    IFERROR: {
      name: 'IFERROR',
      category: 'logical',
      modes: ['query', 'transaction'],
      description: t(
        'Returns value if no error, otherwise returns alternative.',
      ),
      parameters: [
        { name: 'value', description: t('Value') },
        {
          name: 'value_if_error',
          description: t('Value to return when there is an error'),
        },
      ],
    },
    IFNA: {
      name: 'IFNA',
      category: 'logical',
      modes: ['query', 'transaction'],
      description: t(
        'Returns value if not #N/A error, otherwise returns alternative.',
      ),
      parameters: [
        { name: 'value', description: t('Value') },
        {
          name: 'value_if_na',
          description: t('Value to return for #N/A errors'),
        },
      ],
    },
    SWITCH: {
      name: 'SWITCH',
      category: 'logical',
      modes: ['query', 'transaction'],
      description: t(
        'Matches expression against values and returns corresponding result.',
      ),
      parameters: [
        { name: 'expression', description: t('Expression') },
        { name: 'value1', description: t('First value') },
        { name: 'result1', description: t('First result') },
      ],
    },
    CONCATENATE: {
      name: 'CONCATENATE',
      category: 'text',
      modes: ['query', 'transaction'],
      description: t('Combines several text strings into one.'),
      parameters: [
        { name: 'texts', description: t('One or more text values') },
      ],
    },
    INTEGER_TO_AMOUNT: {
      name: 'INTEGER_TO_AMOUNT',
      category: 'other',
      modes: ['query', 'transaction'],
      description: t(
        'Converts integer amount to decimal amount (e.g., 1234 -> 12.34).',
      ),
      parameters: [
        { name: 'integer_amount', description: t('Integer amount in cents') },
        {
          name: 'decimal_places',
          description: t('Number of decimal places (default: 2)'),
        },
      ],
    },
    UPPER: {
      name: 'UPPER',
      category: 'text',
      modes: ['query', 'transaction'],
      description: t('Converts text to uppercase.'),
      parameters: [{ name: 'text', description: t('Text') }],
    },
    LOWER: {
      name: 'LOWER',
      category: 'text',
      modes: ['query', 'transaction'],
      description: t('Converts text to lowercase.'),
      parameters: [{ name: 'text', description: t('Text') }],
    },
    PROPER: {
      name: 'PROPER',
      category: 'text',
      modes: ['query', 'transaction'],
      description: t('Capitalizes first letter of each word.'),
      parameters: [{ name: 'text', description: t('Text') }],
    },
    LEFT: {
      name: 'LEFT',
      category: 'text',
      modes: ['query', 'transaction'],
      description: t('Returns leftmost characters from text.'),
      parameters: [
        { name: 'text', description: t('Text') },
        { name: 'num_chars', description: t('Number of characters') },
      ],
    },
    RIGHT: {
      name: 'RIGHT',
      category: 'text',
      modes: ['query', 'transaction'],
      description: t('Returns rightmost characters from text.'),
      parameters: [
        { name: 'text', description: t('Text') },
        { name: 'num_chars', description: t('Number of characters') },
      ],
    },
    MID: {
      name: 'MID',
      category: 'text',
      modes: ['query', 'transaction'],
      description: t('Returns substring from specified position.'),
      parameters: [
        { name: 'text', description: t('Text') },
        { name: 'start_pos', description: t('Starting position') },
        { name: 'length', description: t('Length') },
      ],
    },
    LEN: {
      name: 'LEN',
      category: 'text',
      modes: ['query', 'transaction'],
      description: t('Returns length of text.'),
      parameters: [{ name: 'text', description: t('Text') }],
    },
    TRIM: {
      name: 'TRIM',
      category: 'text',
      modes: ['query', 'transaction'],
      description: t('Removes extra spaces from text.'),
      parameters: [{ name: 'text', description: t('Text') }],
    },
    SUBSTITUTE: {
      name: 'SUBSTITUTE',
      category: 'text',
      modes: ['query', 'transaction'],
      description: t('Replaces occurrences of text.'),
      parameters: [
        { name: 'text', description: t('Text') },
        { name: 'old_text', description: t('Text to replace') },
        { name: 'new_text', description: t('Replacement text') },
      ],
    },
    REPLACE: {
      name: 'REPLACE',
      category: 'text',
      modes: ['query', 'transaction'],
      description: t('Replaces substring at specified position.'),
      parameters: [
        { name: 'text', description: t('Text') },
        { name: 'start_pos', description: t('Starting position') },
        { name: 'length', description: t('Length') },
        { name: 'new_text', description: t('Replacement text') },
      ],
    },
    FIND: {
      name: 'FIND',
      category: 'text',
      modes: ['query', 'transaction'],
      description: t('Finds text within text (case-sensitive).'),
      parameters: [
        { name: 'find_text', description: t('Text to find') },
        { name: 'within_text', description: t('Text to search within') },
      ],
    },
    SEARCH: {
      name: 'SEARCH',
      category: 'text',
      modes: ['query', 'transaction'],
      description: t(
        'Finds text within text (case-insensitive, supports wildcards).',
      ),
      parameters: [
        { name: 'search_text', description: t('Text to search for') },
        { name: 'text', description: t('Text') },
      ],
    },
    TEXT: {
      name: 'TEXT',
      category: 'text',
      modes: ['query', 'transaction'],
      description: t('Converts number to text with format.'),
      parameters: [
        { name: 'value', description: t('Number') },
        { name: 'format', description: t('Format') },
      ],
    },
    FIXED: {
      name: 'FIXED',
      category: 'text',
      modes: ['query', 'transaction'],
      description: t('Formats a number to a fixed amount of decimal places.'),
      parameters: [
        { name: 'number', description: t('Number') },
        { name: 'decimals', description: t('Decimals') },
      ],
    },
    FORMATNUMBER: {
      name: 'FORMATNUMBER',
      category: 'text',
      modes: ['query', 'transaction'],
      description: t(
        'Formats a number with thousands separators. Uses your app number format settings by default.',
      ),
      parameters: [
        { name: 'value', description: t('Number to format') },
        {
          name: 'decimals',
          description: t('Decimal places (optional, uses app settings)'),
        },
        {
          name: 'thousandsSeparator',
          description: t('Thousands separator (optional, uses app settings)'),
        },
        {
          name: 'decimalSeparator',
          description: t('Decimal separator (optional, uses app settings)'),
        },
      ],
    },
    FORMATCURRENCY: {
      name: 'FORMATCURRENCY',
      category: 'text',
      modes: ['query', 'transaction'],
      description: t(
        'Formats a number as currency. Uses your app currency and number format settings by default.',
      ),
      parameters: [
        { name: 'value', description: t('Number to format') },
        {
          name: 'currencySymbol',
          description: t('Currency symbol (optional, uses app settings)'),
        },
        {
          name: 'decimals',
          description: t('Decimal places (optional, uses app settings)'),
        },
        {
          name: 'thousandsSeparator',
          description: t('Thousands separator (optional, uses app settings)'),
        },
        {
          name: 'decimalSeparator',
          description: t('Decimal separator (optional, uses app settings)'),
        },
        {
          name: 'symbolPosition',
          description: t('"before" or "after" (optional, uses app settings)'),
        },
        {
          name: 'spaceBetweenAmountAndSymbol',
          description: t('TRUE or FALSE (optional, uses app settings)'),
        },
      ],
    },
    REPT: {
      name: 'REPT',
      category: 'text',
      modes: ['query', 'transaction'],
      description: t('Repeats text specified number of times.'),
      parameters: [
        { name: 'text', description: t('Text') },
        { name: 'number', description: t('Number') },
      ],
    },
    CHAR: {
      name: 'CHAR',
      category: 'text',
      modes: ['query', 'transaction'],
      description: t('Converts number to character.'),
      parameters: [{ name: 'number', description: t('Number') }],
    },
    CODE: {
      name: 'CODE',
      category: 'text',
      modes: ['query', 'transaction'],
      description: t('Returns numeric code for first character.'),
      parameters: [{ name: 'text', description: t('Text') }],
    },
    EXACT: {
      name: 'EXACT',
      category: 'text',
      modes: ['query', 'transaction'],
      description: t('Returns TRUE if texts are exactly the same.'),
      parameters: [
        { name: 'text1', description: t('First text value') },
        { name: 'text2', description: t('Second text value') },
      ],
    },
    DATE: {
      name: 'DATE',
      category: 'date',
      modes: ['query', 'transaction'],
      description: t('Returns date as number of days since null date.'),
      parameters: [
        { name: 'year', description: t('Year') },
        { name: 'month', description: t('Month') },
        { name: 'day', description: t('Day') },
      ],
    },
    TODAY: {
      name: 'TODAY',
      category: 'date',
      modes: ['query', 'transaction'],
      description: t('Returns current date.'),
      parameters: [],
    },
    NOW: {
      name: 'NOW',
      category: 'date',
      modes: ['query', 'transaction'],
      description: t('Returns current date and time.'),
      parameters: [],
    },
    YEAR: {
      name: 'YEAR',
      category: 'date',
      modes: ['query', 'transaction'],
      description: t('Returns the year from a date.'),
      parameters: [{ name: 'date', description: t('Date value') }],
    },
    MONTH: {
      name: 'MONTH',
      category: 'date',
      modes: ['query', 'transaction'],
      description: t('Returns the month from a date.'),
      parameters: [{ name: 'date', description: t('Date value') }],
    },
    DAY: {
      name: 'DAY',
      category: 'date',
      modes: ['query', 'transaction'],
      description: t('Returns the day from a date.'),
      parameters: [{ name: 'date', description: t('Date value') }],
    },
    WEEKDAY: {
      name: 'WEEKDAY',
      category: 'date',
      modes: ['query', 'transaction'],
      description: t('Returns day of week (1-7).'),
      parameters: [
        { name: 'date', description: t('Date') },
        { name: 'type', description: t('Return type') },
      ],
    },
    EDATE: {
      name: 'EDATE',
      category: 'date',
      modes: ['query', 'transaction'],
      description: t('Returns date shifted by specified months.'),
      parameters: [
        { name: 'start_date', description: t('Start date') },
        { name: 'months', description: t('Months') },
      ],
    },
    EOMONTH: {
      name: 'EOMONTH',
      category: 'date',
      modes: ['query', 'transaction'],
      description: t('Returns last day of month after specified months.'),
      parameters: [
        { name: 'start_date', description: t('Start date') },
        { name: 'months', description: t('Months') },
      ],
    },
    DAYS: {
      name: 'DAYS',
      category: 'date',
      modes: ['query', 'transaction'],
      description: t('Calculates difference between dates in days.'),
      parameters: [
        { name: 'end_date', description: t('End date') },
        { name: 'start_date', description: t('Start date') },
      ],
    },
    DATEDIF: {
      name: 'DATEDIF',
      category: 'date',
      modes: ['query', 'transaction'],
      description: t('Calculates distance between dates.'),
      parameters: [
        { name: 'start_date', description: t('Start date') },
        { name: 'end_date', description: t('End date') },
        { name: 'unit', description: t('Unit') },
      ],
    },
    NETWORKDAYS: {
      name: 'NETWORKDAYS',
      category: 'date',
      modes: ['query'],
      description: t('Returns number of working days between dates.'),
      parameters: [
        { name: 'start_date', description: t('Start date') },
        { name: 'end_date', description: t('End date') },
      ],
    },
    WEEKNUM: {
      name: 'WEEKNUM',
      category: 'date',
      modes: ['query', 'transaction'],
      description: t('Returns week number of year.'),
      parameters: [
        { name: 'date', description: t('Date') },
        { name: 'type', description: t('Return type') },
      ],
    },
    CHOOSE: {
      name: 'CHOOSE',
      category: 'query',
      modes: ['query'],
      description: t('Returns value from list based on index.'),
      parameters: [
        { name: 'index', description: t('Index (1-based)') },
        { name: 'value1', description: t('First value') },
        { name: 'value2', description: t('Additional values') },
      ],
    },
    ISBLANK: {
      name: 'ISBLANK',
      category: 'query',
      modes: ['query', 'transaction'],
      description: t('Returns TRUE if value is blank.'),
      parameters: [{ name: 'value', description: t('Value') }],
    },
    ISERROR: {
      name: 'ISERROR',
      category: 'query',
      modes: ['query', 'transaction'],
      description: t('Returns TRUE if value is any error.'),
      parameters: [{ name: 'value', description: t('Value') }],
    },
    ISNA: {
      name: 'ISNA',
      category: 'query',
      modes: ['query', 'transaction'],
      description: t('Returns TRUE if value is #N/A error.'),
      parameters: [{ name: 'value', description: t('Value') }],
    },
    ISNUMBER: {
      name: 'ISNUMBER',
      category: 'query',
      modes: ['query', 'transaction'],
      description: t('Returns TRUE if value is a number.'),
      parameters: [{ name: 'value', description: t('Value') }],
    },
    ISTEXT: {
      name: 'ISTEXT',
      category: 'query',
      modes: ['query', 'transaction'],
      description: t('Returns TRUE if value is text.'),
      parameters: [{ name: 'value', description: t('Value') }],
    },
    ISLOGICAL: {
      name: 'ISLOGICAL',
      category: 'query',
      modes: ['query', 'transaction'],
      description: t('Returns TRUE if value is logical (TRUE/FALSE).'),
      parameters: [{ name: 'value', description: t('Value') }],
    },
    ISREF: {
      name: 'ISREF',
      category: 'other',
      modes: ['query'],
      description: t('Returns TRUE if value is a reference.'),
      parameters: [{ name: 'value', description: t('Value') }],
    },
    PMT: {
      name: 'PMT',
      category: 'math',
      modes: ['query'],
      description: t('Calculates payment for a loan.'),
      parameters: [
        { name: 'rate', description: t('Interest rate') },
        { name: 'nper', description: t('Number of periods') },
        { name: 'pv', description: t('Present value') },
      ],
    },
    FV: {
      name: 'FV',
      category: 'math',
      modes: ['query'],
      description: t('Calculates future value of investment.'),
      parameters: [
        { name: 'rate', description: t('Interest rate') },
        { name: 'nper', description: t('Number of periods') },
        { name: 'pmt', description: t('Payment amount') },
      ],
    },
    PV: {
      name: 'PV',
      category: 'math',
      modes: ['query'],
      description: t('Calculates present value of investment.'),
      parameters: [
        { name: 'rate', description: t('Interest rate') },
        { name: 'nper', description: t('Number of periods') },
        { name: 'pmt', description: t('Payment amount') },
      ],
    },
    NPV: {
      name: 'NPV',
      category: 'math',
      modes: ['query'],
      description: t('Calculates net present value.'),
      parameters: [
        { name: 'rate', description: t('Interest rate') },
        { name: 'value1', description: t('First value') },
        { name: 'value2', description: t('Second value') },
      ],
    },
    IRR: {
      name: 'IRR',
      category: 'math',
      modes: ['query'],
      description: t('Calculates internal rate of return.'),
      parameters: [{ name: 'values', description: t('Values') }],
    },
    RATE: {
      name: 'RATE',
      category: 'math',
      modes: ['query'],
      description: t('Calculates interest rate per period.'),
      parameters: [
        { name: 'nper', description: t('Number of periods') },
        { name: 'pmt', description: t('Payment amount') },
        { name: 'pv', description: t('Present value') },
      ],
    },
    QUERY: {
      name: 'QUERY',
      category: 'query',
      modes: ['query'],
      description: t('Execute a query and return the result.'),
      parameters: [
        { name: 'queryName', description: t('Name of the query to execute') },
      ],
    },
    QUERY_COUNT: {
      name: 'QUERY_COUNT',
      category: 'query',
      modes: ['query'],
      description: t('Execute a query and return the number of matching rows.'),
      parameters: [
        { name: 'queryName', description: t('Name of the query to execute') },
      ],
    },
    BALANCE_OF: {
      name: 'BALANCE_OF',
      category: 'other',
      modes: ['transaction'],
      description: t(
        'Running balance for another account (cents) at this transaction, same cutoff as balance. Use a quoted account id for a deterministic match, or a quoted account name. Use the balance variable instead for the current account.',
      ),
      parameters: [
        {
          name: 'account_id_or_name',
          description: t('Quoted account id or exact account name'),
        },
      ],
    },
    CLEAN: {
      name: 'CLEAN',
      category: 'text',
      modes: ['transaction'],
      description: t('Removes non-printable characters from text.'),
      parameters: [{ name: 'text', description: t('Text') }],
    },
    SPLIT: {
      name: 'SPLIT',
      category: 'text',
      modes: ['transaction'],
      description: t('Splits text by space and returns part at index.'),
      parameters: [
        { name: 'text', description: t('Text') },
        { name: 'index', description: t('Index') },
      ],
    },
    INT: {
      name: 'INT',
      category: 'math',
      modes: ['transaction'],
      description: t('Rounds down to nearest integer.'),
      parameters: [{ name: 'number', description: t('Number') }],
    },
    TRUNC: {
      name: 'TRUNC',
      category: 'math',
      modes: ['transaction'],
      description: t('Truncates number to specified decimals.'),
      parameters: [
        { name: 'number', description: t('Number') },
        { name: 'decimals', description: t('Decimals') },
      ],
    },
    SIGN: {
      name: 'SIGN',
      category: 'math',
      modes: ['transaction'],
      description: t('Returns -1 for negative, 0 for zero, 1 for positive.'),
      parameters: [{ name: 'number', description: t('Number') }],
    },
    DATEVALUE: {
      name: 'DATEVALUE',
      category: 'date',
      modes: ['transaction'],
      description: t('Parses a date string and returns it as a number.'),
      parameters: [{ name: 'date_string', description: t('Date string') }],
    },
    ISOWEEKNUM: {
      name: 'ISOWEEKNUM',
      category: 'date',
      modes: ['transaction'],
      description: t('Returns ISO week number.'),
      parameters: [{ name: 'date', description: t('Date') }],
    },
    ISEVEN: {
      name: 'ISEVEN',
      category: 'query',
      modes: ['transaction'],
      description: t('Returns TRUE if number is even.'),
      parameters: [{ name: 'number', description: t('Number') }],
    },
    ISODD: {
      name: 'ISODD',
      category: 'query',
      modes: ['transaction'],
      description: t('Returns TRUE if number is odd.'),
      parameters: [{ name: 'number', description: t('Number') }],
    },
    VALUE: {
      name: 'VALUE',
      category: 'text',
      modes: ['transaction'],
      description: t('Converts text to a number.'),
      parameters: [{ name: 'text', description: t('Text') }],
    },
    T: {
      name: 'T',
      category: 'text',
      modes: ['transaction'],
      description: t('Returns text if value is text, empty string otherwise.'),
      parameters: [{ name: 'value', description: t('Value') }],
    },
    N: {
      name: 'N',
      category: 'text',
      modes: ['transaction'],
      description: t('Converts value to a number.'),
      parameters: [{ name: 'value', description: t('Value') }],
    },
  };
}

function getCompletionSectionName(completion: Completion): string {
  const { section } = completion;
  return typeof section === 'string' ? section : section?.name || '';
}

let formulaFunctionCategoryByName: Record<
  string,
  FormulaFunctionCategory
> | null = null;

function getFormulaFunctionCategoryByName(): Record<
  string,
  FormulaFunctionCategory
> {
  formulaFunctionCategoryByName ??= Object.fromEntries(
    Object.entries(getFormulaFunctionCatalog()).map(([name, func]) => [
      name,
      func.category,
    ]),
  );

  return formulaFunctionCategoryByName;
}

export function getFormulaFunctionsByMode(): Record<FormulaMode, string[]> {
  const functionsByMode: Record<FormulaMode, string[]> = {
    query: [],
    transaction: [],
  };

  for (const [name, func] of Object.entries(getFormulaFunctionCatalog())) {
    for (const mode of func.modes) {
      functionsByMode[mode].push(name);
    }
  }

  return functionsByMode;
}

export function getFormulaFunctionsForMode(
  mode: FormulaMode,
): Record<string, FormulaFunctionDef> {
  const catalog = getFormulaFunctionCatalog();

  return Object.fromEntries(
    Object.entries(catalog).filter(([, func]) => func.modes.includes(mode)),
  );
}

export function getFormulaFunctionByName(
  name: string,
  mode?: FormulaMode,
): FormulaFunctionDef | undefined {
  const upperName = name.toUpperCase();
  const func = getFormulaFunctionCatalog()[upperName];

  if (!func || (mode && !func.modes.includes(mode))) {
    return undefined;
  }

  return func;
}

export function getFormulaCategoryForName(
  name: string,
): FormulaFunctionCategory | undefined {
  return getFormulaFunctionCategoryByName()[name.toUpperCase()];
}

export function getFunctionCompletions(mode: FormulaMode): Completion[] {
  const categoryConfig = getFormulaFunctionCategoryConfig();

  return Object.entries(getFormulaFunctionsForMode(mode)).map(
    ([name, func]) => ({
      label: name,
      type: 'function',
      section: categoryConfig[func.category].section,
      info: [
        func.description,
        '',
        `${t('Parameters:')} ${func.parameters.map(p => p.name).join(', ')}`,
        '',
        func.parameters.map(p => `- ${p.name}: ${p.description}`).join('\n'),
      ].join('\n'),
      apply: `${name}()`,
      boost: 10,
    }),
  );
}

export function getRuleFieldCompletions(): Completion[] {
  const ruleFieldSection = getRuleFieldCompletionSection();

  return [
    {
      label: 'amount',
      type: 'variable',
      section: ruleFieldSection,
      boost: 5,
      info: t(
        'Transaction amount in cents. Use for calculations and comparisons.\n\nExample: =amount / 100 to get dollar value',
      ),
    },
    {
      label: 'date',
      type: 'variable',
      section: ruleFieldSection,
      boost: 5,
      info: t(
        'Transaction date in YYYY-MM-DD format. Use with date functions.\n\nExample: =TEXT(date, "MMMM") to get month name',
      ),
    },
    {
      label: 'notes',
      type: 'variable',
      section: ruleFieldSection,
      boost: 5,
      info: t(
        'Transaction notes/memo text. Use for string operations.\n\nExample: =UPPER(notes) to convert to uppercase',
      ),
    },
    {
      label: 'imported_payee',
      type: 'variable',
      section: ruleFieldSection,
      boost: 5,
      info: t(
        'Original imported payee name from bank import. Contains the raw text before matching.\n\nExample: =LEFT(imported_payee, 10) to get first 10 characters',
      ),
    },
    {
      label: 'payee',
      type: 'variable',
      section: ruleFieldSection,
      boost: 5,
      info: t(
        'Payee ID (string). The ID of the payee.\n\nExample: =CONCATENATE("Payment to ", payee)',
      ),
    },
    {
      label: 'payee_name',
      type: 'variable',
      section: ruleFieldSection,
      boost: 5,
      info: t(
        'Payee name (string). The human-readable name of the payee.\n\nExample: =UPPER(payee_name) or =CONCATENATE("Payment to ", payee_name)',
      ),
    },
    {
      label: 'account',
      type: 'variable',
      section: ruleFieldSection,
      boost: 5,
      info: t(
        'Account ID (string). The ID of the account.\n\nExample: =CONCATENATE("Paid from ", account)',
      ),
    },
    {
      label: 'account_name',
      type: 'variable',
      section: ruleFieldSection,
      boost: 5,
      info: t(
        'Account name (string). The human-readable name of the account.\n\nExample: =CONCATENATE("Paid from ", account_name)',
      ),
    },
    {
      label: 'category',
      type: 'variable',
      section: ruleFieldSection,
      boost: 5,
      info: t(
        'Category ID (string). The ID of the category.\n\nExample: =IF(category="Groceries", "Food", "Other")',
      ),
    },
    {
      label: 'category_name',
      type: 'variable',
      section: ruleFieldSection,
      boost: 5,
      info: t(
        'Category Name (string). The human-readable name of the category.\n\nExample: =IF(category_name="Groceries", "Food", "Other")',
      ),
    },
    {
      label: 'cleared',
      type: 'variable',
      section: ruleFieldSection,
      boost: 5,
      info: t(
        'Boolean cleared status. TRUE if transaction is cleared, FALSE otherwise.\n\nExample: =IF(cleared, "Cleared", "Pending")',
      ),
    },
    {
      label: 'reconciled',
      type: 'variable',
      section: ruleFieldSection,
      boost: 5,
      info: t(
        'Boolean reconciled status. TRUE if transaction is reconciled, FALSE otherwise.',
      ),
    },
    {
      label: 'balance',
      type: 'variable',
      section: ruleFieldSection,
      boost: 5,
      info: t(
        'Account balance as of the date of the transaction, excluding the transaction amount. Use for calculations and comparisons.\n\nExample: =IF(balance < 0, "Negative Balance", "Positive Balance")',
      ),
    },
    {
      label: 'parent_amount',
      type: 'variable',
      section: ruleFieldSection,
      boost: 5,
      info: t(
        'The amount of the parent transaction in cents in split transactions.\n\nExample: =(parent_amount / 100) * .05',
      ),
    },
  ];
}

export function getDynamicReportQueryCompletions(
  queries?: Record<string, unknown>,
): Completion[] {
  if (!queries) {
    return [];
  }

  const queryFunctionSection = getFormulaFunctionCategoryConfig().query.section;

  return Object.keys(queries).flatMap(queryName => [
    {
      label: `QUERY("${queryName}")`,
      type: 'function',
      section: queryFunctionSection,
      info: t('Execute the {{queryName}} query and return the result.', {
        queryName,
      }),
      apply: `QUERY("${queryName}")`,
      boost: 15,
    },
    {
      label: `QUERY_COUNT("${queryName}")`,
      type: 'function',
      section: queryFunctionSection,
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
      section: queryFunctionSection,
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
      section: queryFunctionSection,
      info: t('Sum of spending with extracted parameters from {{queryName}}.', {
        queryName,
      }),
      apply: `BUDGET_QUERY("spent", QUERY_EXTRACT_CATEGORIES("${queryName}"), QUERY_EXTRACT_TIMEFRAME_START("${queryName}"), QUERY_EXTRACT_TIMEFRAME_END("${queryName}"))`,
      boost: 13,
    },
    {
      label: `BUDGET_QUERY("balance_start", QUERY_EXTRACT_CATEGORIES("${queryName}"), QUERY_EXTRACT_TIMEFRAME_START("${queryName}"), QUERY_EXTRACT_TIMEFRAME_END("${queryName}"))`,
      type: 'function',
      section: queryFunctionSection,
      info: t('Opening balance with extracted parameters from {{queryName}}.', {
        queryName,
      }),
      apply: `BUDGET_QUERY("balance_start", QUERY_EXTRACT_CATEGORIES("${queryName}"), QUERY_EXTRACT_TIMEFRAME_START("${queryName}"), QUERY_EXTRACT_TIMEFRAME_END("${queryName}"))`,
      boost: 13,
    },
    {
      label: `BUDGET_QUERY("balance_end", QUERY_EXTRACT_CATEGORIES("${queryName}"), QUERY_EXTRACT_TIMEFRAME_START("${queryName}"), QUERY_EXTRACT_TIMEFRAME_END("${queryName}"))`,
      type: 'function',
      section: queryFunctionSection,
      info: t('Closing balance with extracted parameters from {{queryName}}.', {
        queryName,
      }),
      apply: `BUDGET_QUERY("balance_end", QUERY_EXTRACT_CATEGORIES("${queryName}"), QUERY_EXTRACT_TIMEFRAME_START("${queryName}"), QUERY_EXTRACT_TIMEFRAME_END("${queryName}"))`,
      boost: 13,
    },
  ]);
}

export function getNamedVariableCompletions(
  variables?: Record<string, number | string>,
): Completion[] {
  if (!variables) {
    return [];
  }

  const variableSection = getVariableCompletionSection();

  return Object.entries(variables).map(([varName, value]) => ({
    label: varName,
    type: 'variable',
    section: variableSection,
    info: t('Variable with value: {{value}}', {
      value: String(value),
    }),
    boost: 20,
  }));
}

export function sortFormulaCompletions(
  completions: Completion[],
): Completion[] {
  const sectionOrder = getFormulaCompletionSectionOrder();

  return [...completions].sort((a, b) => {
    const sectionA = getCompletionSectionName(a);
    const sectionB = getCompletionSectionName(b);
    const orderA = sectionOrder[sectionA] ?? 999;
    const orderB = sectionOrder[sectionB] ?? 999;

    if (orderA !== orderB) {
      return orderA - orderB;
    }

    const boostA = a.boost || 0;
    const boostB = b.boost || 0;
    if (boostA !== boostB) {
      return boostB - boostA;
    }

    return a.label.localeCompare(b.label);
  });
}
