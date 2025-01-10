import { Notification } from '../../client/notifications/notificationsSlice';
import * as db from '../db';

import { parse } from './goal-template.pegjs';
import {
  CategoryWithTemplateNote,
  getActiveSchedules,
  getCategoriesWithTemplateNotes,
  resetCategoryGoalDefsWithNoTemplates,
} from './statements';
import { Template } from './types/templates';

export const TEMPLATE_PREFIX = '#template';
export const GOAL_PREFIX = '#goal';

export async function storeTemplates(): Promise<void> {
  const categoriesWithTemplates = await getCategoriesWithTemplates();

  for (const { id, templates } of categoriesWithTemplates) {
    const goalDefs = JSON.stringify(templates);

    await db.update('categories', {
      id,
      goal_def: goalDefs,
    });
  }

  await resetCategoryGoalDefsWithNoTemplates();
}

type CategoryWithTemplates = {
  id: string;
  name: string;
  templates: Template[];
};

export async function checkTemplates(): Promise<Notification> {
  const categoryWithTemplates = await getCategoriesWithTemplates();
  const schedules = await getActiveSchedules();
  const scheduleNames = schedules.map(({ name }) => name);
  const errors: string[] = [];

  categoryWithTemplates.forEach(({ id, name, templates }) => {
    templates.forEach(template => {
      if (template.type === 'error') {
        errors.push(`${name}: ${template.line}`);
      } else if (
        template.type === 'schedule' &&
        !scheduleNames.includes(template.name)
      ) {
        errors.push(`${id}: Schedule “${template.name}” does not exist`);
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

async function getCategoriesWithTemplates(): Promise<CategoryWithTemplates[]> {
  const templatesForCategory: CategoryWithTemplates[] = [];
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
