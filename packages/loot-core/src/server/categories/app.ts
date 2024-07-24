import { CategoryEntity } from 'loot-core/types/models';

import { createApp } from '../app';
import { CategoryError } from '../errors';
import { mutator } from '../mutators';
import { batchMessages } from '../sync';
import { undoable } from '../undo';

import { CategoryHandlers } from './types/handlers';

function validateCategory(rule: Partial<CategoryEntity>) {
  // Returns an array of errors, the array is the same link as the
  // passed-in `array`, or null if there are no errors
  function runValidation<T>(array: T[], validate: (item: T) => unknown) {
    const result = array
      .map(item => {
        try {
          validate(item);
        } catch (e) {
          if (e instanceof CategoryError) {
            console.warn('Invalid rule', e);
            return e.type;
          }
          throw e;
        }
        return null;
      })
      .filter((res): res is string => typeof res === 'string');

    return result.length ? result : null;
  }

  const conditionErrors = runValidation(
    rule.conditions,
    cond =>
      new Condition(
        cond.op,
        cond.field,
        cond.value,
        cond.options,
        ruleFieldTypes,
      ),
  );

  const actionErrors = runValidation(rule.actions, action =>
    action.op === 'link-schedule'
      ? new Action(action.op, null, action.value, null, ruleFieldTypes)
      : new Action(
          action.op,
          action.field,
          action.value,
          action.options,
          ruleFieldTypes,
        ),
  );

  if (conditionErrors || actionErrors) {
    return {
      conditionErrors,
      actionErrors,
    };
  }

  return null;
}

// Expose functions to the client
const app = createApp<CategoryHandlers>();

app.method(
  'category-create',
  mutator(async function ({ name, groupId, isIncome, hidden }) {
    return withUndo(async () => {
      if (!groupId) {
        throw APIError('Creating a category: groupId is required');
      }

      return db.insertCategory({
        name,
        cat_group: groupId,
        is_income: isIncome ? 1 : 0,
        hidden: hidden ? 1 : 0,
      });
    });
  }),
);

app.method(
  'category-update',
  mutator(async function (category) {
    return withUndo(async () => {
      try {
        await db.updateCategory(category);
      } catch (e) {
        if (e.message.toLowerCase().includes('unique constraint')) {
          return { error: { type: 'category-exists' } };
        }
        throw e;
      }
      return {};
    });
  }),
);

app.method(
  'category-move',
  mutator(async function ({ id, groupId, targetId }) {
    return withUndo(async () => {
      await batchMessages(async () => {
        await db.moveCategory(id, groupId, targetId);
      });
      return 'ok';
    });
  }),
);

app.method(
  'category-delete',
  mutator(async function ({ id, transferId }) {
    return withUndo(async () => {
      let result = {};
      await batchMessages(async () => {
        const row = await db.first(
          'SELECT is_income FROM categories WHERE id = ?',
          [id],
        );
        if (!row) {
          result = { error: 'no-categories' };
          return;
        }

        const transfer =
          transferId &&
          (await db.first('SELECT is_income FROM categories WHERE id = ?', [
            transferId,
          ]));

        if (!row || (transferId && !transfer)) {
          result = { error: 'no-categories' };
          return;
        } else if (transferId && row.is_income !== transfer.is_income) {
          result = { error: 'category-type' };
          return;
        }

        // Update spreadsheet values if it's an expense category
        // TODO: We should do this for income too if it's a reflect budget
        if (row.is_income === 0) {
          if (transferId) {
            await budget.doTransfer([id], transferId);
          }
        }

        await db.deleteCategory({ id }, transferId);
      });

      return result;
    });
  }),
);

app.method('get-categories', async function () {
  return {
    grouped: await db.getCategoriesGrouped(),
    list: await db.getCategories(),
  };
});

app.method('get-category-groups', async function () {
  return await db.getCategoriesGrouped();
});

app.method(
  'category-group-create',
  mutator(async function ({ name, isIncome }) {
    return withUndo(async () => {
      return db.insertCategoryGroup({
        name,
        is_income: isIncome ? 1 : 0,
      });
    });
  }),
);

app.method(
  'category-group-update',
  mutator(async function (group) {
    return withUndo(async () => {
      return db.updateCategoryGroup(group);
    });
  }),
);

app.method(
  'category-group-move',
  mutator(async function ({ id, targetId }) {
    return withUndo(async () => {
      await batchMessages(async () => {
        await db.moveCategoryGroup(id, targetId);
      });
      return 'ok';
    });
  }),
);

app.method(
  'category-group-delete',
  mutator(async function ({ id, transferId }) {
    return withUndo(async () => {
      const groupCategories = await db.all(
        'SELECT id FROM categories WHERE cat_group = ? AND tombstone = 0',
        [id],
      );

      return batchMessages(async () => {
        if (transferId) {
          await budget.doTransfer(
            groupCategories.map(c => c.id),
            transferId,
          );
        }
        await db.deleteCategoryGroup({ id }, transferId);
      });
    });
  }),
);

app.method('must-category-transfer', async function ({ id }) {
  const res = await db.runQuery(
    `SELECT count(t.id) as count FROM transactions t
         LEFT JOIN category_mapping cm ON cm.id = t.category
         WHERE cm.transferId = ? AND t.tombstone = 0`,
    [id],
    true,
  );

  // If there are transactions with this category, return early since
  // we already know it needs to be tranferred
  if (res[0].count !== 0) {
    return true;
  }

  // If there are any non-zero budget values, also force the user to
  // transfer the category.
  return [...sheet.get().meta().createdMonths].some(month => {
    const sheetName = monthUtils.sheetForMonth(month);
    const value = sheet.get().getCellValue(sheetName, 'budget-' + id);

    return value != null && value !== 0;
  });
});

app.method('must-category-transfer', async function ({ id }) {
  const res = await db.runQuery(
    `SELECT count(t.id) as count FROM transactions t
           LEFT JOIN category_mapping cm ON cm.id = t.category
           WHERE cm.transferId = ? AND t.tombstone = 0`,
    [id],
    true,
  );

  // If there are transactions with this category, return early since
  // we already know it needs to be tranferred
  if (res[0].count !== 0) {
    return true;
  }

  // If there are any non-zero budget values, also force the user to
  // transfer the category.
  return [...sheet.get().meta().createdMonths].some(month => {
    const sheetName = monthUtils.sheetForMonth(month);
    const value = sheet.get().getCellValue(sheetName, 'budget-' + id);

    return value != null && value !== 0;
  });
});

export default app;
