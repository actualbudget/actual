import * as db from '../db';
import { DbSchedule } from '../db';

import { GOAL_PREFIX, TEMPLATE_PREFIX } from './template-notes';

/* eslint-disable actual/typography */
export async function resetCategoryGoalDefsWithNoTemplates(): Promise<void> {
  await db.run(
    `
      UPDATE categories
      SET goal_def = NULL
      WHERE id NOT IN (SELECT n.id
                       FROM notes n
                       WHERE lower(note) LIKE '%${TEMPLATE_PREFIX}%'
                          OR lower(note) LIKE '%${GOAL_PREFIX}%')
    `,
  );
}

/* eslint-enable actual/typography */

export type CategoryWithTemplateNote = {
  id: string;
  name: string;
  note: string;
};

export async function getCategoriesWithTemplateNotes(): Promise<
  CategoryWithTemplateNote[]
> {
  return await db.all<
    Pick<db.DbCategory, 'id' | 'name'> & Pick<db.DbNote, 'note'>
  >(
    `
      SELECT c.id AS id, c.name as name, n.note AS note
      FROM notes n
             JOIN categories c ON n.id = c.id
      WHERE c.id = n.id
        AND c.tombstone = 0
        AND (lower(note) LIKE '%${TEMPLATE_PREFIX}%'
        OR lower(note) LIKE '%${GOAL_PREFIX}%')
    `,
  );
}

export async function getActiveSchedules() {
  return await db.all<
    Pick<
      DbSchedule,
      | 'id'
      | 'rule'
      | 'active'
      | 'completed'
      | 'posts_transaction'
      | 'tombstone'
      | 'name'
    >
  >(
    'SELECT id, rule, active, completed, posts_transaction, tombstone, name from schedules WHERE name NOT NULL AND tombstone = 0',
  );
}
