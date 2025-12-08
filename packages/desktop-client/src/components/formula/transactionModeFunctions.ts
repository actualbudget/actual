import { t } from 'i18next';

export type FunctionDef = {
  name: string;
  description: string;
  parameters: Array<{ name: string; description: string }>;
};

// Excel formula functions for CodeMirror (Transaction Mode) - Complete set
export const transactionModeFunctions: Record<string, FunctionDef> = {
  // Text Functions (most useful for transaction fields)
  CONCATENATE: {
    name: 'CONCATENATE',
    description: t('Combines several text strings into one.'),
    parameters: [{ name: 'texts', description: 'Text1, Text2, ...TextN' }],
  },
  UPPER: {
    name: 'UPPER',
    description: t('Converts text to uppercase.'),
    parameters: [{ name: 'text', description: 'Text' }],
  },
  LOWER: {
    name: 'LOWER',
    description: t('Converts text to lowercase.'),
    parameters: [{ name: 'text', description: 'Text' }],
  },
  PROPER: {
    name: 'PROPER',
    description: t('Capitalizes first letter of each word.'),
    parameters: [{ name: 'text', description: 'Text' }],
  },
  LEFT: {
    name: 'LEFT',
    description: t('Returns leftmost characters from text.'),
    parameters: [
      { name: 'text', description: 'Text' },
      { name: 'num_chars', description: 'Number' },
    ],
  },
  RIGHT: {
    name: 'RIGHT',
    description: t('Returns rightmost characters from text.'),
    parameters: [
      { name: 'text', description: 'Text' },
      { name: 'num_chars', description: 'Number' },
    ],
  },
  INTEGER_TO_AMOUNT: {
    name: 'INTEGER_TO_AMOUNT',
    description: t(
      'Converts integer amount to decimal amount (e.g., 1234 -> 12.34).',
    ),
    parameters: [
      { name: 'integer_amount', description: 'Integer amount in cents' },
      {
        name: 'decimal_places',
        description: 'Number of decimal places (default: 2)',
      },
    ],
  },
  MID: {
    name: 'MID',
    description: t('Returns substring from specified position.'),
    parameters: [
      { name: 'text', description: 'Text' },
      { name: 'start_pos', description: 'Start_position' },
      { name: 'length', description: 'Length' },
    ],
  },
  LEN: {
    name: 'LEN',
    description: t('Returns length of text.'),
    parameters: [{ name: 'text', description: 'Text' }],
  },
  TRIM: {
    name: 'TRIM',
    description: t('Removes extra spaces from text.'),
    parameters: [{ name: 'text', description: 'Text' }],
  },
  SUBSTITUTE: {
    name: 'SUBSTITUTE',
    description: t('Replaces occurrences of text.'),
    parameters: [
      { name: 'text', description: 'Text' },
      { name: 'old_text', description: 'Old_text' },
      { name: 'new_text', description: 'New_text' },
    ],
  },
  REPLACE: {
    name: 'REPLACE',
    description: t('Replaces substring at specified position.'),
    parameters: [
      { name: 'text', description: 'Text' },
      { name: 'start_pos', description: 'Start_position' },
      { name: 'length', description: 'Length' },
      { name: 'new_text', description: 'New_text' },
    ],
  },
  FIND: {
    name: 'FIND',
    description: t('Finds text within text (case-sensitive).'),
    parameters: [
      { name: 'find_text', description: 'Text1' },
      { name: 'within_text', description: 'Text2' },
    ],
  },
  SEARCH: {
    name: 'SEARCH',
    description: t(
      'Finds text within text (case-insensitive, supports wildcards).',
    ),
    parameters: [
      { name: 'search_text', description: 'Search_string' },
      { name: 'text', description: 'Text' },
    ],
  },
  TEXT: {
    name: 'TEXT',
    description: t('Converts number to text with format.'),
    parameters: [
      { name: 'value', description: 'Number' },
      { name: 'format', description: 'Format' },
    ],
  },
  REPT: {
    name: 'REPT',
    description: t('Repeats text specified number of times.'),
    parameters: [
      { name: 'text', description: 'Text' },
      { name: 'number', description: 'Number' },
    ],
  },
  CHAR: {
    name: 'CHAR',
    description: t('Converts number to character.'),
    parameters: [{ name: 'number', description: 'Number' }],
  },
  CODE: {
    name: 'CODE',
    description: t('Returns numeric code for first character.'),
    parameters: [{ name: 'text', description: 'Text' }],
  },
  EXACT: {
    name: 'EXACT',
    description: t('Returns TRUE if texts are exactly the same.'),
    parameters: [
      { name: 'text1', description: 'Text' },
      { name: 'text2', description: 'Text' },
    ],
  },
  CLEAN: {
    name: 'CLEAN',
    description: t('Removes non-printable characters from text.'),
    parameters: [{ name: 'text', description: 'Text' }],
  },
  SPLIT: {
    name: 'SPLIT',
    description: t('Splits text by space and returns part at index.'),
    parameters: [
      { name: 'text', description: 'Text' },
      { name: 'index', description: 'Index' },
    ],
  },

  // Math Functions (for amount calculations)
  SUM: {
    name: 'SUM',
    description: t('Returns the sum of all numbers.'),
    parameters: [
      { name: 'numbers', description: 'Number1, Number2, ...NumberN' },
    ],
  },
  ABS: {
    name: 'ABS',
    description: t('Returns the absolute value of a number.'),
    parameters: [{ name: 'number', description: 'Number' }],
  },
  ROUND: {
    name: 'ROUND',
    description: t('Rounds a number to specified decimals.'),
    parameters: [
      { name: 'number', description: 'Number' },
      { name: 'decimals', description: 'Decimals' },
    ],
  },
  ROUNDDOWN: {
    name: 'ROUNDDOWN',
    description: t('Rounds down to specified decimals.'),
    parameters: [
      { name: 'number', description: 'Number' },
      { name: 'decimals', description: 'Decimals' },
    ],
  },
  ROUNDUP: {
    name: 'ROUNDUP',
    description: t('Rounds up to specified decimals.'),
    parameters: [
      { name: 'number', description: 'Number' },
      { name: 'decimals', description: 'Decimals' },
    ],
  },
  FLOOR: {
    name: 'FLOOR',
    description: t('Rounds down to nearest multiple of significance.'),
    parameters: [
      { name: 'number', description: 'Number' },
      { name: 'significance', description: 'Significance' },
    ],
  },
  CEILING: {
    name: 'CEILING',
    description: t('Rounds up to nearest multiple of significance.'),
    parameters: [
      { name: 'number', description: 'Number' },
      { name: 'significance', description: 'Significance' },
    ],
  },
  INT: {
    name: 'INT',
    description: t('Rounds down to nearest integer.'),
    parameters: [{ name: 'number', description: 'Number' }],
  },
  TRUNC: {
    name: 'TRUNC',
    description: t('Truncates number to specified decimals.'),
    parameters: [
      { name: 'number', description: 'Number' },
      { name: 'decimals', description: 'Decimals' },
    ],
  },
  MOD: {
    name: 'MOD',
    description: t('Returns the remainder of division.'),
    parameters: [
      { name: 'dividend', description: 'Dividend' },
      { name: 'divisor', description: 'Divisor' },
    ],
  },
  POWER: {
    name: 'POWER',
    description: t('Returns base raised to the power of exponent.'),
    parameters: [
      { name: 'base', description: 'Base' },
      { name: 'exponent', description: 'Exponent' },
    ],
  },
  SQRT: {
    name: 'SQRT',
    description: t('Returns the square root.'),
    parameters: [{ name: 'number', description: 'Number' }],
  },
  SIGN: {
    name: 'SIGN',
    description: t('Returns -1 for negative, 0 for zero, 1 for positive.'),
    parameters: [{ name: 'number', description: 'Number' }],
  },

  // Date and Time Functions
  DATE: {
    name: 'DATE',
    description: t('Returns date as number of days since null date.'),
    parameters: [
      { name: 'year', description: 'Year' },
      { name: 'month', description: 'Month' },
      { name: 'day', description: 'Day' },
    ],
  },
  TODAY: {
    name: 'TODAY',
    description: t('Returns current date.'),
    parameters: [],
  },
  NOW: {
    name: 'NOW',
    description: t('Returns current date and time.'),
    parameters: [],
  },
  YEAR: {
    name: 'YEAR',
    description: t('Returns the year from a date.'),
    parameters: [{ name: 'date', description: 'Number' }],
  },
  MONTH: {
    name: 'MONTH',
    description: t('Returns the month from a date.'),
    parameters: [{ name: 'date', description: 'Number' }],
  },
  DAY: {
    name: 'DAY',
    description: t('Returns the day from a date.'),
    parameters: [{ name: 'date', description: 'Number' }],
  },
  WEEKDAY: {
    name: 'WEEKDAY',
    description: t('Returns day of week (1-7).'),
    parameters: [
      { name: 'date', description: 'Date' },
      { name: 'type', description: 'Type' },
    ],
  },
  EDATE: {
    name: 'EDATE',
    description: t('Returns date shifted by specified months.'),
    parameters: [
      { name: 'start_date', description: 'Startdate' },
      { name: 'months', description: 'Months' },
    ],
  },
  EOMONTH: {
    name: 'EOMONTH',
    description: t('Returns last day of month after specified months.'),
    parameters: [
      { name: 'start_date', description: 'Startdate' },
      { name: 'months', description: 'Months' },
    ],
  },
  DAYS: {
    name: 'DAYS',
    description: t('Calculates difference between dates in days.'),
    parameters: [
      { name: 'end_date', description: 'Date2' },
      { name: 'start_date', description: 'Date1' },
    ],
  },
  DATEDIF: {
    name: 'DATEDIF',
    description: t('Calculates distance between dates.'),
    parameters: [
      { name: 'start_date', description: 'Date1' },
      { name: 'end_date', description: 'Date2' },
      { name: 'unit', description: 'Unit' },
    ],
  },
  DATEVALUE: {
    name: 'DATEVALUE',
    description: t('Parses a date string and returns it as a number.'),
    parameters: [{ name: 'date_string', description: 'Datestring' }],
  },
  WEEKNUM: {
    name: 'WEEKNUM',
    description: t('Returns week number of year.'),
    parameters: [
      { name: 'date', description: 'Date' },
      { name: 'type', description: 'Type' },
    ],
  },
  ISOWEEKNUM: {
    name: 'ISOWEEKNUM',
    description: t('Returns ISO week number.'),
    parameters: [{ name: 'date', description: 'Date' }],
  },

  // Logical Functions
  IF: {
    name: 'IF',
    description: t('Returns one value if condition is TRUE, another if FALSE.'),
    parameters: [
      { name: 'condition', description: 'Condition' },
      { name: 'value_if_true', description: 'ValueIfTrue' },
      { name: 'value_if_false', description: 'ValueIfFalse' },
    ],
  },
  IFS: {
    name: 'IFS',
    description: t(
      'Checks multiple conditions and returns corresponding values.',
    ),
    parameters: [
      { name: 'condition1', description: 'Condition1' },
      { name: 'value1', description: 'Value1' },
    ],
  },
  AND: {
    name: 'AND',
    description: t('Returns TRUE if all arguments are TRUE.'),
    parameters: [
      {
        name: 'conditions',
        description: 'Condition1, Condition2, ...ConditionN',
      },
    ],
  },
  OR: {
    name: 'OR',
    description: t('Returns TRUE if any argument is TRUE.'),
    parameters: [
      {
        name: 'conditions',
        description: 'Condition1, Condition2, ...ConditionN',
      },
    ],
  },
  XOR: {
    name: 'XOR',
    description: t('Returns TRUE if odd number of arguments are TRUE.'),
    parameters: [
      {
        name: 'conditions',
        description: 'Condition1, Condition2, ...ConditionN',
      },
    ],
  },
  NOT: {
    name: 'NOT',
    description: t('Reverses the logical value.'),
    parameters: [{ name: 'condition', description: 'Condition' }],
  },
  TRUE: {
    name: 'TRUE',
    description: t('Returns the logical value TRUE.'),
    parameters: [],
  },
  FALSE: {
    name: 'FALSE',
    description: t('Returns the logical value FALSE.'),
    parameters: [],
  },
  IFERROR: {
    name: 'IFERROR',
    description: t('Returns value if no error, otherwise returns alternative.'),
    parameters: [
      { name: 'value', description: 'Value' },
      { name: 'value_if_error', description: 'ValueIfError' },
    ],
  },
  IFNA: {
    name: 'IFNA',
    description: t(
      'Returns value if not #N/A error, otherwise returns alternative.',
    ),
    parameters: [
      { name: 'value', description: 'Value' },
      { name: 'value_if_na', description: 'ValueIfNA' },
    ],
  },
  SWITCH: {
    name: 'SWITCH',
    description: t(
      'Matches expression against values and returns corresponding result.',
    ),
    parameters: [
      { name: 'expression', description: 'Expression' },
      { name: 'value1', description: 'Value1' },
      { name: 'result1', description: 'Result1' },
    ],
  },

  // Information Functions
  ISBLANK: {
    name: 'ISBLANK',
    description: t('Returns TRUE if value is blank.'),
    parameters: [{ name: 'value', description: 'Value' }],
  },
  ISERROR: {
    name: 'ISERROR',
    description: t('Returns TRUE if value is any error.'),
    parameters: [{ name: 'value', description: 'Value' }],
  },
  ISNA: {
    name: 'ISNA',
    description: t('Returns TRUE if value is #N/A error.'),
    parameters: [{ name: 'value', description: 'Value' }],
  },
  ISNUMBER: {
    name: 'ISNUMBER',
    description: t('Returns TRUE if value is a number.'),
    parameters: [{ name: 'value', description: 'Value' }],
  },
  ISTEXT: {
    name: 'ISTEXT',
    description: t('Returns TRUE if value is text.'),
    parameters: [{ name: 'value', description: 'Value' }],
  },
  ISLOGICAL: {
    name: 'ISLOGICAL',
    description: t('Returns TRUE if value is logical (TRUE/FALSE).'),
    parameters: [{ name: 'value', description: 'Value' }],
  },
  ISREF: {
    name: 'ISREF',
    description: t('Returns TRUE if value is a reference.'),
    parameters: [{ name: 'value', description: 'Value' }],
  },
  ISEVEN: {
    name: 'ISEVEN',
    description: t('Returns TRUE if number is even.'),
    parameters: [{ name: 'number', description: 'Number' }],
  },
  ISODD: {
    name: 'ISODD',
    description: t('Returns TRUE if number is odd.'),
    parameters: [{ name: 'number', description: 'Number' }],
  },

  // Conversion Functions
  VALUE: {
    name: 'VALUE',
    description: t('Converts text to a number.'),
    parameters: [{ name: 'text', description: 'Text' }],
  },
  T: {
    name: 'T',
    description: t('Returns text if value is text, empty string otherwise.'),
    parameters: [{ name: 'value', description: 'Value' }],
  },
  N: {
    name: 'N',
    description: t('Converts value to a number.'),
    parameters: [{ name: 'value', description: 'Value' }],
  },
};
