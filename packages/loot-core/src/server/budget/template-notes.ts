import { Notification } from '../../client/state-types/notifications';
import * as db from '../db';

import { parse } from './goal-template.pegjs';
import {
  getActiveCategories,
  getActiveSchedules,
  getTemplateNotesForCategories,
  getTemplateNotesForCategory,
  resetCategoryGoalDefsWithNoTemplates,
} from './statements';

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

export async function getCategoriesWithTemplates(): Promise<
  CategoryWithTemplates[]
> {
  const templatesForCategory: CategoryWithTemplates[] = [];
  const templateNotes: TemplateNote[] = await getTemplateNotesForCategories();

  templateNotes.forEach(({ category_id, note }: TemplateNote) => {
    const parsedTemplates = [];

    note.split('\n').forEach(line => {
      try {
        const parsedTemplate = parse(line.trim());
        parsedTemplates.push(parsedTemplate);
      } catch (e) {
        return { type: 'error', line, error: e };
      }
    });

    templatesForCategory.push({ category_id, templates: parsedTemplates });
  });

  return templatesForCategory;
}

export async function checkTemplateNotes(): Promise<Notification> {
  const categories = await getActiveCategories();
  const schedules = await getActiveSchedules();
  const scheduleNames = schedules.map(({ name }) => name);
  const errors: string[] = [];

  for (const { id, name: category_name } of categories) {
    const templateNotes = await getTemplateNotesForCategory(id);

    templateNotes.forEach((note: TemplateNote) => {
      if (note.type === 'error') {
        errors.push(`${category_name}: ${note.line}`);
      } else if (
        note.type === 'schedule' &&
        !scheduleNames.includes(note.name)
      ) {
        errors.push(`${category_name}: Schedule “${note.name}” does not exist`);
      }
    });
  }

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
