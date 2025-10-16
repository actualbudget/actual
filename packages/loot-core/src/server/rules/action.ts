// @ts-strict-ignore
import * as dateFns from 'date-fns';
import * as Handlebars from 'handlebars';

import { logger } from '../../platform/server/log';
import { parseDate, format, currentDay } from '../../shared/months';
import { FIELD_TYPES } from '../../shared/rules';

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
        if (this.handlebarsTemplate) {
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
