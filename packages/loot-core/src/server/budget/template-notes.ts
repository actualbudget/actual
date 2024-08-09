import { Notification } from '../../client/state-types/notifications';
import * as db from '../db';
import { Note } from '../db/types';

import { parse } from './goal-template.pegjs';
import {
  getActiveSchedules,
  getCategoriesWithTemplateNotes,
  resetCategoryGoalDefsWithNoTemplates,
} from './statements';
import { Template } from './types/templates';

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
  const templatesForCategory = await getCategoriesWithTemplates();
  const schedules = await getActiveSchedules();
  const scheduleNames = schedules.map(({ name }) => name);
  const errors: string[] = [];

  templatesForCategory.forEach(({ id, name, templates }) => {
    console.log('checking templates for category', id);
    console.log('templates', templates);
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

  templateNotes.forEach(({ id, name, note }: Note) => {
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

    templatesForCategory.push({
      id,
      name,
      templates: parsedTemplates,
    });
  });

  return templatesForCategory;
}
