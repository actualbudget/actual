import * as db from '../db';
import { Schedule, TemplateNote } from '../db/types';

const TEMPLATE_PREFIX = '#template';
const GOAL_PREFIX = '#goal';

/* eslint-disable rulesdir/typography */
export async function resetCategoryGoalDefsWithNoTemplates(): Promise<void> {
  await db.run(
    `
      UPDATE categories
      SET goal_def = NULL
      WHERE id NOT IN (SELECT id
                       FROM notes
                       WHERE lower(note) LIKE '%${TEMPLATE_PREFIX}%'
                          OR lower(note) LIKE '%${GOAL_PREFIX}%')
    `,
  );
}

/* eslint-enable rulesdir/typography */

export async function getTemplateNotesForCategories(): Promise<TemplateNote[]> {
  return await db.all(
    `
      SELECT n.id AS category_id, n.note AS note
      FROM notes n
      WHERE n.id IN (SELECT id FROM categories)
        AND (lower(note) LIKE '%${TEMPLATE_PREFIX}%'
        OR lower(note) LIKE '%${GOAL_PREFIX}%')
    `,
  );
}

export async function getActiveSchedules(): Promise<Schedule[]> {
  return await db.all(
    'SELECT id, rule, active, completed, posts_transaction, tombstone, name from schedules WHERE name NOT NULL AND tombstone = 0',
  );
}
