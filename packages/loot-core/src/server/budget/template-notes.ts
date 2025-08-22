import type { Template } from '../../types/models/templates';

import { storeTemplates } from './goal-template';
import { parse } from './goal-template.pegjs';
import {
  CategoryWithTemplateNote,
  getActiveSchedules,
  getCategoriesWithTemplateNotes,
  resetCategoryGoalDefsWithNoTemplates,
} from './statements';

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
        errors.push(`${name}: Schedule “${template.name}” does not exist`);
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
          parsedTemplate.type === 'schedule' &&
          parsedTemplate.adjustment !== undefined
        ) {
          if (
            parsedTemplate.adjustment <= -100 ||
            parsedTemplate.adjustment > 1000
          ) {
            throw new Error(
              `Invalid adjustment percentage (${parsedTemplate.adjustment}%). Must be between -100% and 1000%`,
            );
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
