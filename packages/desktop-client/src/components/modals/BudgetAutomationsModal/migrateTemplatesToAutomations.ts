import { dayFromDate, firstDayOfMonth } from '@actual-app/core/shared/months';
import type { Template } from '@actual-app/core/types/models/templates';

import { createAutomationEntry } from '#components/budget/goals/automationExamples';
import type { AutomationEntry } from '#components/budget/goals/automationExamples';
import type { DisplayTemplateType } from '#components/budget/goals/constants';

function getDisplayTypeFromTemplate(template: Template): DisplayTemplateType {
  switch (template.type) {
    case 'percentage':
      return 'percentage';
    case 'schedule':
      return 'schedule';
    case 'periodic':
    case 'simple':
      return 'fixed';
    case 'limit':
      return 'limit';
    case 'refill':
      return 'refill';
    case 'average':
    case 'copy':
      return 'historical';
    case 'by':
      return 'by';
    case 'remainder':
      return 'remainder';
    case 'goal':
      return 'goal';
    case 'error':
    case 'spend':
      // filtered upstream by hasUnsupportedDirective; surface if it ever isn't
      throw new Error(`Unsupported template type reached migration`);
    default: {
      const _exhaustive: never = template;
      void _exhaustive;
      throw new Error(`Unhandled template type`);
    }
  }
}

export function migrateTemplatesToAutomations(
  templates: Template[],
): AutomationEntry[] {
  const entries: AutomationEntry[] = [];

  templates.forEach(template => {
    if (template.type === 'simple') {
      const monthly = template.monthly;
      const hasMonthly = monthly != null && monthly !== 0;

      if (template.limit) {
        entries.push(
          createAutomationEntry(
            {
              type: 'limit',
              amount: template.limit.amount,
              hold: template.limit.hold,
              period: template.limit.period,
              start: template.limit.start,
              directive: 'template',
              priority: null,
            },
            'limit',
          ),
        );
        // The implicit refill only applies to a limit-only simple template
        // (e.g. `#template up to 200`). When a monthly amount is also set
        // (`#template 50 up to 200`), the engine just budgets the monthly
        // amount and clamps to the cap — no top-up to the limit.
        if (!hasMonthly) {
          entries.push(
            createAutomationEntry(
              {
                type: 'refill',
                directive: 'template',
                priority: template.priority,
              },
              'refill',
            ),
          );
        }
      }
      if (hasMonthly) {
        entries.push(
          createAutomationEntry(
            {
              type: 'periodic',
              amount: monthly,
              period: { period: 'month', amount: 1 },
              starting: dayFromDate(firstDayOfMonth(new Date())),
              directive: 'template',
              priority: template.priority,
            },
            'fixed',
          ),
        );
      }

      // a simple template with neither monthly nor limit is a no-op; drop it
      // rather than passing through as a phantom 'fixed' entry that would
      // crash FixedAutomationReadOnly (no .amount, no .period)
      return;
    }

    entries.push(
      createAutomationEntry(template, getDisplayTypeFromTemplate(template)),
    );
  });

  return entries;
}
