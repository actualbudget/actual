// @ts-strict-ignore
import * as dateFns from 'date-fns';
import * as Handlebars from 'handlebars';
import { HyperFormula } from 'hyperformula';

import { logger } from '../../platform/server/log';
import { parseDate, format, currentDay } from '../../shared/months';
import { FIELD_TYPES } from '../../shared/rules';
import { TransactionForRules } from '../transactions/transaction-rules';

import { CustomFunctionsPlugin } from './customFunctions';
import { assert } from './rule-utils';

const ACTION_OPS = [
  'set',
  'set-split-amount',
  'link-schedule',
  'prepend-notes',
  'append-notes',
  'delete-transaction',
] as const;
type ActionOperator = (typeof ACTION_OPS)[number];

export class Action {
  field;
  op: ActionOperator;
  options;
  rawValue;
  type;
  value;

  private handlebarsTemplate?: Handlebars.TemplateDelegate;

  constructor(op: ActionOperator, field, value, options) {
    assert(
      ACTION_OPS.includes(op),
      'internal',
      `Invalid action operation: ${op}`,
    );

    if (op === 'set') {
      const typeName = FIELD_TYPES.get(field);
      assert(typeName, 'internal', `Invalid field for action: ${field}`);
      this.field = field;
      this.type = typeName;
      if (options?.template) {
        this.handlebarsTemplate = Handlebars.compile(options.template, {
          noEscape: true,
        });
        try {
          this.handlebarsTemplate({});
        } catch (e) {
          logger.debug(e);
          assert(false, 'invalid-template', `Invalid Handlebars template`);
        }
      }
    } else if (op === 'set-split-amount') {
      this.field = null;
      this.type = 'number';
    } else if (op === 'link-schedule') {
      this.field = null;
      this.type = 'id';
    } else if (op === 'prepend-notes' || op === 'append-notes') {
      this.field = 'notes';
      this.type = 'id';
    }

    if (field === 'account') {
      assert(value, 'no-null', `Field cannot be empty: ${field}`);
    }

    this.op = op;
    this.rawValue = value;
    this.value = value;
    this.options = options;
  }

  exec(object) {
    switch (this.op) {
      case 'set':
        if (this.options?.formula) {
          try {
            if (!object._ruleErrors) {
              object._ruleErrors = [];
            }

            const result = this.executeFormulaSync(
              this.options.formula,
              object,
            );

            switch (this.type) {
              case 'number': {
                const numValue =
                  typeof result === 'number'
                    ? result
                    : parseFloat(String(result));

                if (isNaN(numValue)) {
                  const error = `Formula for “${this.field}” must produce a numeric value. Got: ${JSON.stringify(result)}`;
                  object._ruleErrors.push(error);
                } else {
                  object[this.field] = numValue;
                }
                break;
              }
              case 'date': {
                const parsed = parseDate(String(result));
                if (parsed && dateFns.isValid(parsed)) {
                  object[this.field] = format(parsed, 'yyyy-MM-dd');
                } else {
                  const error = `Formula for “${this.field}” must produce a valid date. Got: ${JSON.stringify(result)}`;
                  object._ruleErrors.push(error);
                }
                break;
              }
              case 'boolean': {
                object[this.field] =
                  typeof result === 'boolean'
                    ? result
                    : String(result).toLowerCase() === 'true';
                break;
              }
              case 'string': {
                object[this.field] = String(result);
                break;
              }
            }
          } catch (err) {
            const error = `Error executing formula for “${this.field}”: ${err instanceof Error ? err.message : String(err)}`;
            object._ruleErrors.push(error);
            break;
          }
        } else if (this.handlebarsTemplate) {
          object[this.field] = this.handlebarsTemplate({
            ...object,
            today: currentDay(),
          });

          // Handlebars always returns a string, so we need to convert
          switch (this.type) {
            case 'number': {
              const numValue = parseFloat(object[this.field]);
              // If the result is NaN, default to 0 to avoid database insertion errors
              object[this.field] = isNaN(numValue) ? 0 : numValue;
              break;
            }
            case 'date': {
              const parsed = parseDate(object[this.field]);
              if (parsed && dateFns.isValid(parsed)) {
                object[this.field] = format(parsed, 'yyyy-MM-dd');
              } else {
                // Keep original string; log for diagnostics but avoid hard crash
                logger.error(
                  `rules: invalid date produced by template for field “${this.field}”:`,
                  object[this.field],
                );
                // Make it stick like a sore thumb
                object[this.field] = '9999-12-31';
              }
              break;
            }
            case 'boolean':
              object[this.field] = object[this.field] === 'true';
              break;
          }
        } else {
          object[this.field] = this.value;
        }

        if (this.field === 'payee_name') {
          object['payee'] = 'new';
        }
        break;
      case 'set-split-amount':
        switch (this.options.method) {
          case 'fixed-amount':
            object.amount = this.value;
            break;
          default:
        }
        break;
      case 'link-schedule':
        object.schedule = this.value;
        break;
      case 'prepend-notes':
        object[this.field] = object[this.field]
          ? this.value + object[this.field]
          : this.value;
        break;
      case 'append-notes':
        object[this.field] = object[this.field]
          ? object[this.field] + this.value
          : this.value;
        break;
      case 'delete-transaction':
        object['tombstone'] = 1;
        break;
      default:
    }
  }

  extractVariablesFromAST(ast: unknown): Set<string> {
    const variables = new Set<string>();

    const walk = (node: unknown): void => {
      if (!node || typeof node !== 'object') {
        return;
      }

      const typedNode = node as {
        type?: string;
        value?: string;
        args?: unknown[];
      };

      if (
        typedNode.type === 'CELL_REFERENCE' &&
        typeof typedNode.value === 'string'
      ) {
        variables.add(typedNode.value);
      }

      if (Array.isArray(typedNode.args)) {
        for (const arg of typedNode.args) {
          walk(arg);
        }
      }

      for (const value of Object.values(typedNode)) {
        if (typeof value === 'object' && value !== null) {
          walk(value);
        }
      }
    };

    walk(ast);
    return variables;
  }

  executeFormulaSync(
    formula: string,
    transaction: Partial<TransactionForRules>,
  ): unknown {
    let hfInstance: ReturnType<typeof HyperFormula.buildEmpty> | null = null;

    if (!formula || !formula.startsWith('=')) {
      throw new Error('Formula must start with =');
    }

    try {
      HyperFormula.registerFunctionPlugin(CustomFunctionsPlugin);

      hfInstance = HyperFormula.buildEmpty({
        licenseKey: 'gpl-v3',
      });

      const sheetName = hfInstance.addSheet('Sheet1');
      const sheetId = hfInstance.getSheetId(sheetName);

      if (sheetId === undefined) {
        throw new Error('Failed to create sheet');
      }

      const fieldValues: Partial<TransactionForRules> & {
        today: string;
        account_name: string;
        category_name: string;
      } = {
        ...transaction,
        today: currentDay(),
        account_name: transaction._account_name || '',
        category_name: transaction._category_name || '',
      };

      for (const key of Object.keys(fieldValues)) {
        let cellValue: string | number | boolean;
        if (
          fieldValues[key] === undefined ||
          fieldValues[key] === null ||
          typeof fieldValues[key] === 'object'
        ) {
          cellValue = '';
        } else {
          cellValue = fieldValues[key];
        }
        hfInstance.addNamedExpression(key, cellValue);
      }

      hfInstance.setCellContents({ sheet: sheetId, col: 0, row: 0 }, [
        [formula],
      ]);

      const cellAddress = { sheet: sheetId, col: 0, row: 0 };
      const cellValue = hfInstance.getCellValue(cellAddress);

      if (cellValue && typeof cellValue === 'object' && 'type' in cellValue) {
        throw new Error(`Formula error: ${cellValue.message}`);
      }

      return cellValue;
    } catch (err) {
      logger.error('Formula execution error:', err);
      throw err;
    } finally {
      try {
        hfInstance?.destroy();
      } catch (err) {
        logger.error('Error destroying HyperFormula instance:', err);
      }
    }
  }

  serialize() {
    return {
      op: this.op,
      field: this.field,
      value: this.value,
      type: this.type,
      ...(this.options ? { options: this.options } : {}),
    };
  }
}
