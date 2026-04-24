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
    default:
      return 'fixed';
  }
}

export function migrateTemplatesToAutomations(
  templates: Template[],
): AutomationEntry[] {
  const entries: AutomationEntry[] = [];

  templates.forEach(template => {
    if (template.type === 'simple') {
      let hasExpandedTemplate = false;
      const hasMonthly = template.monthly != null && template.monthly !== 0;

      if (template.limit) {
        hasExpandedTemplate = true;
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
      if (template.monthly != null && template.monthly !== 0) {
        hasExpandedTemplate = true;
        entries.push(
          createAutomationEntry(
            {
              type: 'periodic',
              amount: template.monthly,
              period: { period: 'month', amount: 1 },
              starting: dayFromDate(firstDayOfMonth(new Date())),
              directive: 'template',
              priority: template.priority,
            },
            'fixed',
          ),
        );
      }

      if (!hasExpandedTemplate) {
        entries.push(
          createAutomationEntry(template, getDisplayTypeFromTemplate(template)),
        );
      }
      return;
    }

    entries.push(
      createAutomationEntry(template, getDisplayTypeFromTemplate(template)),
    );
  });

  return entries;
}
