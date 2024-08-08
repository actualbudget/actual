import { Notification } from '../../client/state-types/notifications';
import * as db from '../db';
import { TemplateNote } from '../db/types';

import { parse } from './goal-template.pegjs';
import {
  getActiveSchedules,
  getTemplateNotesForCategories,
  resetCategoryGoalDefsWithNoTemplates,
} from './statements';
import { Template } from './types/templates';

export async function storeTemplates(): Promise<void> {
  const categoriesWithTemplates = await getCategoriesWithTemplates();

  for (const { category_id, templates } of categoriesWithTemplates) {
    const goalDefs = JSON.stringify(templates);

    await db.update('categories', {
      id: category_id,
      goal_def: goalDefs,
    });
  }

  await resetCategoryGoalDefsWithNoTemplates();
}

type CategoryWithTemplates = {
  category_id: string;
  templates: Template[];
};

export async function checkTemplates(): Promise<Notification> {
  const templatesForCategory = await getCategoriesWithTemplates();
  const schedules = await getActiveSchedules();
  const scheduleNames = schedules.map(({ name }) => name);
  const errors: string[] = [];

  templatesForCategory.forEach(({ category_id, templates }) => {
    console.log('checking templates for category', category_id);
    console.log('templates', templates);
    templates.forEach(template => {
      if (template.type === 'error') {
        errors.push(`${category_id}: ${template.line}`);
      } else if (
        template.type === 'schedule' &&
        !scheduleNames.includes(template.name)
      ) {
        errors.push(
          `${category_id}: Schedule “${template.name}” does not exist`,
        );
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
  const templateNotes: TemplateNote[] = await getTemplateNotesForCategories();

  templateNotes.forEach(({ category_id, note }: TemplateNote) => {
    if (!note) {
      return;
    }

    const parsedTemplates = [];

    note.split('\n').forEach(line => {
      try {
        const parsedTemplate = parse(line.trim());
        parsedTemplates.push(parsedTemplate);
      } catch (e) {
        parsedTemplates.push({ type: 'error', line, error: e });
      }
    });

    templatesForCategory.push({ category_id, templates: parsedTemplates });
  });

  return templatesForCategory;
}
