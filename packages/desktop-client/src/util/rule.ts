// @ts-strict-ignore
import type { RuleEntity } from '@actual-app/core/types/models';
import { t } from 'i18next';
import { v4 as uuidv4 } from 'uuid';

export type ActionSplit = {
  id: string;
  actions: RuleEntity['actions'];
};

export function groupActionsBySplitIndex(
  actions: RuleEntity['actions'],
): ActionSplit[] {
  return actions.reduce((acc, action) => {
    const splitIndex =
      'options' in action ? (action.options?.splitIndex ?? 0) : 0;
    acc[splitIndex] = acc[splitIndex] ?? {
      id: uuidv4(),
      actions: [],
    };
    acc[splitIndex].actions.push(action);
    return acc;
  }, [] as ActionSplit[]);
}

export function getAllocationMethods(hasFormulaMode = false) {
  return {
    'fixed-amount': t('a fixed amount'),
    'fixed-percent': t('a fixed percent of the remainder'),
    ...(hasFormulaMode && { formula: t('based on a formula') }),
    remainder: t('an equal portion of the remainder'),
  };
}

export function mapField(field, opts?) {
  opts = opts || {};

  switch (field) {
    case 'imported_payee':
      return t('imported payee');
    case 'payee_name':
      return t('payee (name)');
    case 'amount':
      if (opts.inflow) {
        return t('amount (inflow)');
      } else if (opts.outflow) {
        return t('amount (outflow)');
      }
      return t('amount');
    case 'amount-inflow':
      return t('amount (inflow)');
    case 'amount-outflow':
      return t('amount (outflow)');
    case 'account':
      return t('account');
    case 'date':
      return t('date');
    case 'category':
      return t('category');
    case 'category_group':
      return t('category group');
    case 'notes':
      return t('notes');
    case 'payee':
      return t('payee');
    case 'saved':
      return t('saved');
    case 'cleared':
      return t('cleared');
    case 'reconciled':
      return t('reconciled');
    case 'transfer':
      return t('transfer');
    default:
      return field;
  }
}

export function friendlyOp(op, type?) {
  switch (op) {
    case 'oneOf':
      return t('one of');
    case 'notOneOf':
      return t('not one of');
    case 'is':
      return t('is');
    case 'isNot':
      return t('is not');
    case 'isapprox':
      return t('is approx');
    case 'isbetween':
      return t('is between');
    case 'contains':
      return t('contains');
    case 'hasTags':
      return t('has all tags');
    case 'hasAnyTag':
      return t('has any tag');
    case 'matches':
      return t('matches');
    case 'doesNotContain':
      return t('does not contain');
    case 'gt':
      if (type === 'date') {
        return t('is after');
      }
      return t('is greater than');
    case 'gte':
      if (type === 'date') {
        return t('is after or equals');
      }
      return t('is greater than or equals');
    case 'lt':
      if (type === 'date') {
        return t('is before');
      }
      return t('is less than');
    case 'lte':
      if (type === 'date') {
        return t('is before or equals');
      }
      return t('is less than or equals');
    case 'true':
      return t('is true');
    case 'false':
      return t('is false');
    case 'set':
      return t('set');
    case 'set-split-amount':
      return t('allocate');
    case 'link-schedule':
      return t('link schedule');
    case 'prepend-notes':
      return t('prepend to notes');
    case 'append-notes':
      return t('append to notes');
    case 'and':
      return t('and');
    case 'or':
      return t('or');
    case 'onBudget':
      return t('is on budget');
    case 'offBudget':
      return t('is off budget');
    case 'delete-transaction':
      return t('delete transaction');
    default:
      return '';
  }
}

export function translateRuleStage(stage: string): string {
  switch (stage) {
    case 'pre':
      return t('Pre');
    case 'post':
      return t('Post');
    default:
      return '';
  }
}
