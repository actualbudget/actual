import { validateExcelFormula } from './excelFormula';
import type { FormulaNode } from './FormulaEditor';

export function validateFormula(formula: FormulaNode | null): string[] {
  const errors: string[] = [];

  if (!formula) {
    return ['Formula is empty'];
  }

  function validateNode(node: FormulaNode): void {
    switch (node.type) {
      case 'excel formula': {
        // Must have a numeric value
        const num = Number(node.value);
        if (Number.isNaN(num)) {
          if ((node.value?.toString() ?? '').startsWith('=')) {
            const validation = validateExcelFormula(node.value?.toString());
            if (!validation.isValid) {
              errors.push(validation.error ?? `Unknown error in node ${node.id}`);
            }
          } else {
            errors.push(`Invalid numeric value in node ${node.id}`);
          }
        }
        break;
      }

      case 'sum': {
        // Sum must have from, to, right
        if (!node.from || !node.to || !node.right) {
          errors.push(`Sum node ${node.id} is missing required components`);
        }
        break;
      }
      case 'division':
      case 'multiplication':
      case 'addition':
      case 'subtraction': {
        // These must have left, right
        if (!node.left || !node.right) {
          errors.push(
            `${node.type} node ${node.id} is missing required components`,
          );
        }
        break;
      }
      case 'power': {
        // power must have base, exponent
        if (!node.base || !node.exponent) {
          errors.push(`Power node ${node.id} is missing required components`);
        }
        break;
      }
      default: {
        errors.push(`Unknown node type: ${node.type}`);
      }
    }

    // Check if this node is an operator but has no children → It's a "leaf" operator
    if (
      node.type !== 'excel formula' &&
      !node.from &&
      !node.to &&
      !node.left &&
      !node.right &&
      !node.base &&
      !node.exponent
    ) {
      errors.push(
        `Leaf node ${node.id} is not a value (it’s an operator with no children).`,
      );
    }

    // Recursively validate children
    for (const key of [
      'from',
      'to',
      'left',
      'right',
      'base',
      'exponent',
    ] as const) {
      if (node[key]) {
        validateNode(node[key] as FormulaNode);
      }
    }
  }

  validateNode(formula);
  return errors;
}
