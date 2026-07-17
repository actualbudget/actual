import * as db from '#server/db';
import { batchMessages } from '#server/sync';
import type { CategoryGroupEntity } from '#types/models';

export async function sortCategories({
  groupId,
  direction,
}: {
  groupId: CategoryGroupEntity['id'];
  direction: 'asc' | 'desc';
}): Promise<void> {
  const groups = await db.getCategoriesGrouped();
  const group = groups.find(g => g.id === groupId);
  if (!group?.categories?.length) return;

  const sorted = [...group.categories].sort((a, b) =>
    direction === 'asc'
      ? a.name.localeCompare(b.name)
      : b.name.localeCompare(a.name),
  );

  for (let i = sorted.length - 1; i >= 0; i--) {
    await batchMessages(async () => {
      await db.moveCategory(
        sorted[i].id,
        groupId,
        i === sorted.length - 1 ? null : sorted[i + 1].id,
      );
    });
  }
}
