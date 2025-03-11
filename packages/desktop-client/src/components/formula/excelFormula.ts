import { HyperFormula } from 'hyperformula';

// Initialize HyperFormula with necessary configuration
const hfConfig = {
  licenseKey: 'gpl-v3',
};

// Create a singleton instance of HyperFormula
let hf: HyperFormula;

// Initialize HyperFormula with a virtual sheet
export function initializeHyperFormula() {
  if (!hf) {
    hf = HyperFormula.buildEmpty(hfConfig);
    // Add a virtual sheet to work with
    hf.addSheet('Sheet1');
  }
  return hf;
}

// Get the HyperFormula instance
export function getHyperFormula() {
  if (!hf) {
    return initializeHyperFormula();
  }
  return hf;
}

// Custom variables that will be replaced with stub values
const customVariables: Record<string, number> = {
  BUDGETEDVALUE: 1000,
  ACTUALVALUE: 800,
  TARGETVALUE: 1200,
  MINVALUE: 500,
  MAXVALUE: 1500,
};

// Replace custom variables with their stub values
function replaceCustomVariables(formula: string): string {
  let result = formula;
  Object.entries(customVariables).forEach(([variable, value]) => {
    const regex = new RegExp(variable, 'gi');
    result = result.replace(regex, value.toString());
  });
  return result;
}

// Validate an Excel formula
export function validateExcelFormula(formula: string): {
  isValid: boolean;
  error?: string;
} {
  try {
    if (!formula.startsWith('=')) {
      return { isValid: true }; // It's plain text, not an Excel formula
    }

    const hf = getHyperFormula();
    const sheetId = hf.getSheetId('Sheet1');
    const cellAddress = { sheet: sheetId, row: 0, col: 0 };

    // Replace custom variables
    const processedFormula = '=' + replaceCustomVariables(formula.substring(1));

    // Try setting the formula in the sheet
    hf.setCellContents(cellAddress, [[processedFormula]]);

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid formula',
    };
  }
}

// Evaluate an Excel formula
export function evaluateExcelFormula(formula: string): {
  result: number | string;
  error?: string;
} {
  try {
    if (!formula.startsWith('=')) {
      return { result: formula }; // Not an Excel formula
    }

    const hf = getHyperFormula();
    const sheetId = hf.getSheetId('Sheet1');
    const cellAddress = { sheet: sheetId, row: 0, col: 0 };

    // Replace custom variables
    const processedFormula = '=' + replaceCustomVariables(formula.substring(1));

    // Set the processed formula in a cell
    hf.setCellContents(cellAddress, [[processedFormula]]);

    // Get the calculated value
    const result = hf.getCellValue(cellAddress);

    return { result: result?.toString() ?? '' };
  } catch (error) {
    return {
      result: '#ERROR',
      error:
        error instanceof Error ? error.message : 'Error evaluating formula',
    };
  }
}

// Get function suggestions based on the current input
export function getFunctionSuggestions(input: string): string[] {
  const commonFunctions = [
    'SUM',
    'AVERAGE',
    'MAX',
    'MIN',
    'COUNT',
    'IF',
    'VLOOKUP',
    'INDEX',
    'MATCH',
    'CONCATENATE',
    'LEFT',
    'RIGHT',
    'MID',
    'LEN',
    'ROUND',
    'ROUNDUP',
    'ROUNDDOWN',
    'ABS',
    'RAND',
    'RANDBETWEEN',
  ];

  if (!input || input === '=') {
    return commonFunctions;
  }

  const searchText = input.startsWith('=')
    ? input.substring(1).toLowerCase()
    : input.toLowerCase();
  return commonFunctions.filter(name =>
    name.toLowerCase().includes(searchText),
  );
}

// Get parameter info for a function
export function getFunctionParameterInfo(functionName: string): {
  parameters: string[];
  description: string;
} {
  const functionInfo: Record<
    string,
    { parameters: string[]; description: string }
  > = {
    SUM: {
      parameters: ['number1', 'number2', '...'],
      description: 'Adds all the numbers in a range of cells.',
    },
    AVERAGE: {
      parameters: ['number1', 'number2', '...'],
      description: 'Returns the average (arithmetic mean) of the arguments.',
    },
    MAX: {
      parameters: ['number1', 'number2', '...'],
      description: 'Returns the maximum value in a list of arguments.',
    },
    MIN: {
      parameters: ['number1', 'number2', '...'],
      description: 'Returns the minimum value in a list of arguments.',
    },
    IF: {
      parameters: ['logical_test', 'value_if_true', 'value_if_false'],
      description:
        "Returns one value if a condition is true and another value if it's false.",
    },
    COUNT: {
      parameters: ['value1', 'value2', '...'],
      description: 'Counts how many numbers are in the list of arguments.',
    },
    CONCATENATE: {
      parameters: ['text1', 'text2', '...'],
      description: 'Joins several text items into one text item.',
    },
    ROUND: {
      parameters: ['number', 'num_digits'],
      description: 'Rounds a number to a specified number of digits.',
    },
  };

  return (
    functionInfo[functionName.toUpperCase()] || {
      parameters: ['...'],
      description: 'No description available.',
    }
  );
}

// Get the current parameter index based on cursor position
export function getCurrentParameterIndex(
  formula: string,
  cursorPosition: number,
): {
  functionName: string;
  parameterIndex: number;
  openParens: number;
} {
  // Default values
  let functionName = '';
  let parameterIndex = 0;
  let openParens = 0;

  // Check if we're inside a function
  const beforeCursor = formula.substring(0, cursorPosition);
  const functionMatch = beforeCursor.match(/=([A-Za-z0-9_]+)\(/);

  if (functionMatch) {
    functionName = functionMatch[1];

    // Count commas before cursor to determine parameter index
    const functionStart = beforeCursor.indexOf(functionMatch[0]);
    const relevantPart = beforeCursor.substring(functionStart);

    // Handle nested parentheses
    let commaCount = 0;

    for (let i = 0; i < relevantPart.length; i++) {
      const char = relevantPart[i];

      if (char === '(') {
        openParens++;
      } else if (char === ')') {
        openParens--;
      } else if (char === ',' && openParens === 1) {
        // Only count commas at the top level of the current function
        commaCount++;
      }
    }

    parameterIndex = commaCount;
  }

  return { functionName, parameterIndex, openParens };
}

// Get available custom variables
export function getCustomVariables(): string[] {
  return Object.keys(customVariables);
}
