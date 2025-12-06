import { t } from 'i18next';

export type FunctionDef = {
  name: string;
  description: string;
  parameters: Array<{ name: string; description: string }>;
};

// Excel formula functions for CodeMirror (Query Mode) - Complete set
export const queryModeFunctions: Record<string, FunctionDef> = {
  // Math and Aggregation Functions
  SUM: {
    name: 'SUM',
    description: t('Returns the sum of all numbers in a range.'),
    parameters: [
      { name: 'numbers', description: 'Number1, Number2, ...NumberN' },
    ],
  },
  AVERAGE: {
    name: 'AVERAGE',
    description: t('Returns the average of all numbers in a range.'),
    parameters: [
      { name: 'numbers', description: 'Number1, Number2, ...NumberN' },
    ],
  },
  AVERAGEA: {
    name: 'AVERAGEA',
    description: t('Returns the average, including text and logical values.'),
    parameters: [{ name: 'values', description: 'Value1, Value2, ...ValueN' }],
  },
  COUNT: {
    name: 'COUNT',
    description: t('Counts the number of numeric values.'),
    parameters: [{ name: 'values', description: 'Value1, Value2, ...ValueN' }],
  },
  COUNTA: {
    name: 'COUNTA',
    description: t('Counts non-empty values.'),
    parameters: [{ name: 'values', description: 'Value1, Value2, ...ValueN' }],
  },
  COUNTBLANK: {
    name: 'COUNTBLANK',
    description: t('Counts empty cells.'),
    parameters: [{ name: 'range', description: 'Range' }],
  },
  COUNTIF: {
    name: 'COUNTIF',
    description: t('Counts cells that meet a criteria.'),
    parameters: [
      { name: 'range', description: 'Range' },
      { name: 'criteria', description: 'Criteria' },
    ],
  },
  COUNTIFS: {
    name: 'COUNTIFS',
    description: t('Counts cells that meet multiple criteria.'),
    parameters: [
      { name: 'range1', description: 'Range1' },
      { name: 'criteria1', description: 'Criteria1' },
    ],
  },
  MAX: {
    name: 'MAX',
    description: t('Returns the maximum value.'),
    parameters: [
      { name: 'numbers', description: 'Number1, Number2, ...NumberN' },
    ],
  },
  MAXA: {
    name: 'MAXA',
    description: t(
      'Returns the maximum value, including text and logical values.',
    ),
    parameters: [{ name: 'values', description: 'Value1, Value2, ...ValueN' }],
  },
  MIN: {
    name: 'MIN',
    description: t('Returns the minimum value.'),
    parameters: [
      { name: 'numbers', description: 'Number1, Number2, ...NumberN' },
    ],
  },
  MINA: {
    name: 'MINA',
    description: t(
      'Returns the minimum value, including text and logical values.',
    ),
    parameters: [{ name: 'values', description: 'Value1, Value2, ...ValueN' }],
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
  MOD: {
    name: 'MOD',
    description: t('Returns the remainder of division.'),
    parameters: [
      { name: 'dividend', description: 'Dividend' },
      { name: 'divisor', description: 'Divisor' },
    ],
  },
  PI: {
    name: 'PI',
    description: t('Returns the value of PI.'),
    parameters: [],
  },
  SIN: {
    name: 'SIN',
    description: t('Returns the sine of an angle.'),
    parameters: [{ name: 'angle', description: 'Angle' }],
  },
  COS: {
    name: 'COS',
    description: t('Returns the cosine of an angle.'),
    parameters: [{ name: 'angle', description: 'Angle' }],
  },
  TAN: {
    name: 'TAN',
    description: t('Returns the tangent of an angle.'),
    parameters: [{ name: 'angle', description: 'Angle' }],
  },
  LN: {
    name: 'LN',
    description: t('Returns the natural logarithm.'),
    parameters: [{ name: 'number', description: 'Number' }],
  },
  LOG: {
    name: 'LOG',
    description: t('Returns the logarithm to specified base.'),
    parameters: [
      { name: 'number', description: 'Number' },
      { name: 'base', description: 'Base' },
    ],
  },
  LOG10: {
    name: 'LOG10',
    description: t('Returns the base-10 logarithm.'),
    parameters: [{ name: 'number', description: 'Number' }],
  },
  EXP: {
    name: 'EXP',
    description: t('Returns e raised to the power of number.'),
    parameters: [{ name: 'number', description: 'Number' }],
  },
  PRODUCT: {
    name: 'PRODUCT',
    description: t('Returns the product of all numbers.'),
    parameters: [
      { name: 'numbers', description: 'Number1, Number2, ...NumberN' },
    ],
  },
  SUMIF: {
    name: 'SUMIF',
    description: t('Sums cells that meet a criteria.'),
    parameters: [
      { name: 'range', description: 'Range' },
      { name: 'criteria', description: 'Criteria' },
      { name: 'sum_range', description: 'SumRange' },
    ],
  },
  SUMIFS: {
    name: 'SUMIFS',
    description: t('Sums cells that meet multiple criteria.'),
    parameters: [
      { name: 'sum_range', description: 'SumRange' },
      { name: 'range1', description: 'Range1' },
      { name: 'criteria1', description: 'Criteria1' },
    ],
  },
  SUMPRODUCT: {
    name: 'SUMPRODUCT',
    description: t('Multiplies corresponding elements and returns the sum.'),
    parameters: [
      { name: 'array1', description: 'Array1' },
      { name: 'array2', description: 'Array2' },
    ],
  },
  SUMSQ: {
    name: 'SUMSQ',
    description: t('Returns the sum of the squares.'),
    parameters: [
      { name: 'numbers', description: 'Number1, Number2, ...NumberN' },
    ],
  },

  // Statistical Functions
  MEDIAN: {
    name: 'MEDIAN',
    description: t('Returns the median value.'),
    parameters: [
      { name: 'numbers', description: 'Number1, Number2, ...NumberN' },
    ],
  },
  MODE: {
    name: 'MODE',
    description: t('Returns the most frequently occurring value.'),
    parameters: [
      { name: 'numbers', description: 'Number1, Number2, ...NumberN' },
    ],
  },
  STDEV: {
    name: 'STDEV',
    description: t('Returns the standard deviation of a sample.'),
    parameters: [
      { name: 'numbers', description: 'Number1, Number2, ...NumberN' },
    ],
  },
  STDEVP: {
    name: 'STDEVP',
    description: t('Returns the standard deviation of a population.'),
    parameters: [
      { name: 'numbers', description: 'Number1, Number2, ...NumberN' },
    ],
  },
  VAR: {
    name: 'VAR',
    description: t('Returns the variance of a sample.'),
    parameters: [{ name: 'values', description: 'Value1, Value2, ...ValueN' }],
  },
  VARP: {
    name: 'VARP',
    description: t('Returns the variance of a population.'),
    parameters: [{ name: 'values', description: 'Value1, Value2, ...ValueN' }],
  },
  PERCENTILE: {
    name: 'PERCENTILE',
    description: t('Returns the k-th percentile.'),
    parameters: [
      { name: 'array', description: 'Array' },
      { name: 'k', description: 'K' },
    ],
  },
  QUARTILE: {
    name: 'QUARTILE',
    description: t('Returns the quartile of a dataset.'),
    parameters: [
      { name: 'array', description: 'Array' },
      { name: 'quart', description: 'Quart' },
    ],
  },
  RANK: {
    name: 'RANK',
    description: t('Returns the rank of a number in a list.'),
    parameters: [
      { name: 'value', description: 'Value' },
      { name: 'array', description: 'Array' },
      { name: 'order', description: 'Order' },
    ],
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

  // Text Functions
  CONCATENATE: {
    name: 'CONCATENATE',
    description: t('Combines several text strings into one.'),
    parameters: [{ name: 'texts', description: 'Text1, Text2, ...TextN' }],
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
  NETWORKDAYS: {
    name: 'NETWORKDAYS',
    description: t('Returns number of working days between dates.'),
    parameters: [
      { name: 'start_date', description: 'Date1' },
      { name: 'end_date', description: 'Date2' },
    ],
  },
  WEEKNUM: {
    name: 'WEEKNUM',
    description: t('Returns week number of year.'),
    parameters: [
      { name: 'date', description: 'Date' },
      { name: 'type', description: 'Type' },
    ],
  },

  // Lookup and Reference
  VLOOKUP: {
    name: 'VLOOKUP',
    description: t('Searches vertically in first column and returns value.'),
    parameters: [
      { name: 'lookup_value', description: 'LookupValue' },
      { name: 'table_array', description: 'TableArray' },
      { name: 'col_index', description: 'ColIndex' },
      { name: 'range_lookup', description: 'RangeLookup' },
    ],
  },
  HLOOKUP: {
    name: 'HLOOKUP',
    description: t('Searches horizontally in first row and returns value.'),
    parameters: [
      { name: 'lookup_value', description: 'LookupValue' },
      { name: 'table_array', description: 'TableArray' },
      { name: 'row_index', description: 'RowIndex' },
      { name: 'range_lookup', description: 'RangeLookup' },
    ],
  },
  INDEX: {
    name: 'INDEX',
    description: t('Returns value at specified row and column.'),
    parameters: [
      { name: 'array', description: 'Array' },
      { name: 'row', description: 'Row' },
      { name: 'column', description: 'Column' },
    ],
  },
  MATCH: {
    name: 'MATCH',
    description: t('Returns position of value in array.'),
    parameters: [
      { name: 'lookup_value', description: 'LookupValue' },
      { name: 'lookup_array', description: 'LookupArray' },
      { name: 'match_type', description: 'MatchType' },
    ],
  },
  CHOOSE: {
    name: 'CHOOSE',
    description: t('Returns value from list based on index.'),
    parameters: [
      { name: 'index', description: 'Index' },
      { name: 'value1', description: 'Value1' },
      { name: 'value2', description: 'Value2' },
    ],
  },
  LOOKUP: {
    name: 'LOOKUP',
    description: t('Looks up values in a vector or array.'),
    parameters: [
      { name: 'lookup_value', description: 'LookupValue' },
      { name: 'lookup_vector', description: 'LookupVector' },
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

  // Financial Functions
  PMT: {
    name: 'PMT',
    description: t('Calculates payment for a loan.'),
    parameters: [
      { name: 'rate', description: 'Rate' },
      { name: 'nper', description: 'Nper' },
      { name: 'pv', description: 'PV' },
    ],
  },
  FV: {
    name: 'FV',
    description: t('Calculates future value of investment.'),
    parameters: [
      { name: 'rate', description: 'Rate' },
      { name: 'nper', description: 'Nper' },
      { name: 'pmt', description: 'PMT' },
    ],
  },
  PV: {
    name: 'PV',
    description: t('Calculates present value of investment.'),
    parameters: [
      { name: 'rate', description: 'Rate' },
      { name: 'nper', description: 'Nper' },
      { name: 'pmt', description: 'PMT' },
    ],
  },
  NPV: {
    name: 'NPV',
    description: t('Calculates net present value.'),
    parameters: [
      { name: 'rate', description: 'Rate' },
      { name: 'value1', description: 'Value1' },
      { name: 'value2', description: 'Value2' },
    ],
  },
  IRR: {
    name: 'IRR',
    description: t('Calculates internal rate of return.'),
    parameters: [{ name: 'values', description: 'Values' }],
  },
  RATE: {
    name: 'RATE',
    description: t('Calculates interest rate per period.'),
    parameters: [
      { name: 'nper', description: 'Nper' },
      { name: 'pmt', description: 'PMT' },
      { name: 'pv', description: 'PV' },
    ],
  },

  // Query-specific
  QUERY: {
    name: 'QUERY',
    description: t('Execute a query and return the result.'),
    parameters: [
      { name: 'queryName', description: 'Name of the query to execute' },
    ],
  },
};
