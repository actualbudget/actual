import type { Template } from '../../types/models/templates';

import { storeTemplates } from './goal-template';
import { parse } from './goal-template.pegjs';
import {
  getActiveSchedules,
  getCategoriesWithTemplateNotes,
  resetCategoryGoalDefsWithNoTemplates,
} from './statements';
import type { CategoryWithTemplateNote } from './statements';

type Notification = {
  type?: 'message' | 'error' | 'warning' | undefined;
  pre?: string | undefined;
  message: string;
  sticky?: boolean | undefined;
};

export const TEMPLATE_PREFIX = '#template';
export const GOAL_PREFIX = '#goal';

export async function storeNoteTemplates(): Promise<void> {
  const categoriesWithTemplates = await getCategoriesWithTemplates();

  await storeTemplates({ categoriesWithTemplates, source: 'notes' });

  await resetCategoryGoalDefsWithNoTemplates();
}

type CategoryWithTemplateNotes = {
  id: string;
  name: string;
  templates: Template[];
};

export async function checkTemplateNotes(): Promise<Notification> {
  const categoryWithTemplates = await getCategoriesWithTemplates();
  const schedules = await getActiveSchedules();
  const scheduleNames = schedules.map(({ name }) => name);
  const errors: string[] = [];

  categoryWithTemplates.forEach(({ name, templates }) => {
    templates.forEach(template => {
      if (template.type === 'error') {
        // Only show detailed error for adjustment-related errors
        if (template.error && template.error.includes('adjustment')) {
          errors.push(`${name}: ${template.line}\nError: ${template.error}`);
        } else {
          errors.push(`${name}: ${template.line}`);
        }
      } else if (
        template.type === 'schedule' &&
        !scheduleNames.includes(template.name)
      ) {
        errors.push(`${name}: Schedule "${template.name}" does not exist`);
      }
    });
  });

  if (errors.length) {
    return {
      sticky: true,
      message: 'There were errors interpreting some templates:',
      pre: errors.join('\n\n'),
    };
  }

  return {
    type: 'message',
    message: 'All templates passed! 🎉',
  };
}

async function getCategoriesWithTemplates(): Promise<
  CategoryWithTemplateNotes[]
> {
  const templatesForCategory: CategoryWithTemplateNotes[] = [];
  const templateNotes = await getCategoriesWithTemplateNotes();

  templateNotes.forEach(({ id, name, note }: CategoryWithTemplateNote) => {
    if (!note) {
      return;
    }

    const parsedTemplates: Template[] = [];

    note.split('\n').forEach(line => {
      const trimmedLine = line.substring(line.indexOf('#')).trim();

      if (
        !trimmedLine.startsWith(TEMPLATE_PREFIX) &&
        !trimmedLine.startsWith(GOAL_PREFIX)
      ) {
        return;
      }

      try {
        const parsedTemplate: Template = parse(trimmedLine);

        // Validate schedule adjustments
        if (
          (parsedTemplate.type === 'average' ||
            parsedTemplate.type === 'schedule') &&
          parsedTemplate.adjustment !== undefined
        ) {
          if (parsedTemplate.adjustmentType === 'percent') {
            if (
              parsedTemplate.adjustment <= -100 ||
              parsedTemplate.adjustment > 1000
            ) {
              throw new Error(
                `Invalid adjustment percentage (${parsedTemplate.adjustment}%). Must be between -100% and 1000%`,
              );
            }
          } else if (parsedTemplate.adjustmentType === 'fixed') {
            //placeholder for potential validation of amount/fixed adjustments
          }
        }

        parsedTemplates.push(parsedTemplate);
      } catch (e: unknown) {
        parsedTemplates.push({
          type: 'error',
          directive: 'error',
          line,
          error: (e as Error).message,
        });
      }
    });

    if (!parsedTemplates.length) {
      return;
    }

    templatesForCategory.push({
      id,
      name,
      templates: parsedTemplates,
    });
  });

  return templatesForCategory;
}

function prefixFromPriority(priority: number | null): string {
  return priority === null ? TEMPLATE_PREFIX : `${TEMPLATE_PREFIX}-${priority}`;
}

export async function unparse(templates: Template[]): Promise<string> {
  // Refill will be merged into the limit template if both exist
  // Assumption: at most one limit and one refill template per category
  const refill = templates.find(t => t.type === 'refill');
  const withoutRefill = templates.filter(t => t.type !== 'refill');

  return withoutRefill
    .flatMap(template => {
      if (template.type === 'error') {
        return [];
      }

      if (template.type === 'goal') {
        return `${GOAL_PREFIX} ${template.amount}`;
      }

      const prefix = prefixFromPriority(template.priority);

      switch (template.type) {
        case 'simple': {
          // Simple template syntax: #template[-prio] simple [monthly N] [limit]
          let result = prefix;
          if (template.monthly != null) {
            result += ` ${template.monthly}`;
          }
          if (template.limit) {
            result += ` ${limitToString(template.limit)}`;
          }
          return result.trim();
        }
        case 'schedule': {
          // schedule syntax: #template[-prio] schedule <name> [full] [ [increase/decrease N%] ]
          let result = `${prefix} schedule`;
          if (template.full) {
            result += ' full';
          }
          result += ` ${template.name}`;
          if (template.adjustment !== undefined) {
            const adj = template.adjustment;
            const op = adj >= 0 ? 'increase' : 'decrease';
            const val = Math.abs(adj);
            const type = template.adjustmentType === 'percent' ? '%' : '';
            result += ` [${op} ${val}${type}]`;
          }
          return result;
        }
        case 'percentage': {
          // #template[-prio] <percent>% of [previous ]<category>
          const prev = template.previous ? 'previous ' : '';
          return `${prefix} ${trimTrailingZeros(template.percent)}% of ${prev}${template.category}`.trim();
        }
        case 'periodic': {
          // #template[-prio] <amount> repeat every <n> <period>(s) starting <date> [limit]
          const periodPart = periodToString(template.period);
          let result = `${prefix} ${template.amount} repeat every ${periodPart} starting ${template.starting}`;
          if (template.limit) {
            result += ` ${limitToString(template.limit)}`;
          }
          return result;
        }
        case 'by':
        case 'spend': {
          // #template[-prio] <amount> by <month> [spend from <month>] [repeat every <...>]
          let result = `${prefix} ${template.amount} by ${template.month}`;
          if (template.type === 'spend' && template.from) {
            result += ` spend from ${template.from}`;
          }
          // repeat info
          if (template.annual !== undefined) {
            const repeatInfo = repeatToString(template.annual, template.repeat);
            if (repeatInfo) {
              result += ` repeat every ${repeatInfo}`;
            }
          }
          return result;
        }
        case 'remainder': {
          // #template remainder [weight] [limit]
          let result = `${prefix} remainder`;
          if (template.weight !== undefined && template.weight !== 1) {
            result += ` ${template.weight}`;
          }
          if (template.limit) {
            result += ` ${limitToString(template.limit)}`;
          }
          return result;
        }
        case 'average': {
          let result = `${prefix} average ${template.numMonths} months`;

          if (template.adjustment !== undefined) {
            const adj = template.adjustment;
            const op = adj >= 0 ? 'increase' : 'decrease';
            const val = Math.abs(adj);
            const type = template.adjustmentType === 'percent' ? '%' : '';
            result += ` [${op} ${val}${type}]`;
          }

          // #template average <numMonths> months [increase/decrease {number|number%}]
          return result;
        }
        case 'copy': {
          // #template copy from <lookBack> months ago [limit]
          const result = `${prefix} copy from ${template.lookBack} months ago`;
          return result;
        }
        case 'limit': {
          if (!refill) {
            // #template 0 up to <limit>
            return `${prefix} 0 ${limitToString(template)}`;
          }
          // #template up to <limit>
          const mergedPrefix = prefixFromPriority(refill.priority);
          return `${mergedPrefix} ${limitToString(template)}`;
        }
        // No 'refill' support since a refill requires a limit
        default:
          return [];
      }
    })
    .join('\n');
}

function limitToString(limit: {
  amount: number;
  hold: boolean;
  period?: 'daily' | 'weekly' | 'monthly';
  start?: string | undefined;
}): string {
  switch (limit.period) {
    case 'weekly': {
      // Needs start date per grammar
      const base = `up to ${limit.amount} per week starting ${limit.start}`;
      return limit.hold ? `${base} hold` : base;
    }
    case 'daily': {
      const base = `up to ${limit.amount} per day`;
      return limit.hold ? `${base} hold` : base;
    }
    case 'monthly':
    default: {
      const base = `up to ${limit.amount}`;
      return limit.hold ? `${base} hold` : base;
    }
  }
}

function periodToString(p: {
  period: 'day' | 'week' | 'month' | 'year';
  amount: number;
}): string {
  const { period, amount } = p;
  if (amount === 1) {
    return period; // singular
  }
  // pluralize simple
  return `${amount} ${period}s`;
}

function repeatToString(annual?: boolean, repeat?: number): string | null {
  if (annual === undefined) return null;
  if (annual) {
    if (!repeat || repeat === 1) return 'year';
    return `${repeat} years`;
  }
  // monthly
  if (!repeat || repeat === 1) return 'month';
  return `${repeat} months`;
}

function trimTrailingZeros(n: number): string {
  const s = n.toString();
  if (!s.includes('.')) return s;
  return s.replace(/\.0+$/, '').replace(/(\.[0-9]*[1-9])0+$/, '$1');
}
