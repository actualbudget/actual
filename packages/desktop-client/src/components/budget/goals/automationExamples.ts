import {
  addMonths,
  dayFromDate,
  firstDayOfMonth,
  monthFromDate,
} from '@actual-app/core/shared/months';
import type { Template } from '@actual-app/core/types/models/templates';
import uniqueId from 'lodash/uniqueId';

import type { DisplayTemplateType } from './constants';
import { DEFAULT_PRIORITY } from './reducer';

export type AutomationEntry = {
  id: string;
  template: Template;
  displayType: DisplayTemplateType;
};

export function createAutomationEntry(
  template: Template,
  displayType: DisplayTemplateType,
): AutomationEntry {
  return {
    id: uniqueId('automation-'),
    template,
    displayType,
  };
}

export type AutomationExample = {
  displayType: DisplayTemplateType;
  create: () => AutomationEntry;
};

export function getAutomationExamples(): AutomationExample[] {
  return [
    {
      displayType: 'fixed',
      create: () =>
        createAutomationEntry(
          {
            directive: 'template',
            type: 'periodic',
            amount: 100,
            period: { period: 'month', amount: 1 },
            starting: dayFromDate(firstDayOfMonth(new Date())),
            priority: DEFAULT_PRIORITY,
          },
          'fixed',
        ),
    },
    {
      displayType: 'by',
      create: () =>
        createAutomationEntry(
          {
            directive: 'template',
            type: 'by',
            amount: 1200,
            // Always 12 months out so users in late-year months don't get a
            // target that's already passed.
            month: addMonths(monthFromDate(new Date()), 12),
            annual: true,
            repeat: 1,
            priority: DEFAULT_PRIORITY,
          },
          'by',
        ),
    },
    {
      displayType: 'schedule',
      create: () =>
        createAutomationEntry(
          {
            directive: 'template',
            type: 'schedule',
            name: '',
            priority: DEFAULT_PRIORITY,
          },
          'schedule',
        ),
    },
  ];
}
