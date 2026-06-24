import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { CategoryEntity } from '@actual-app/core/types/models/category';

import { NotesButton } from '#components/NotesButton';
import { useNotes } from '#hooks/useNotes';

type SidebarCategoryButtonsProps = {
  category: CategoryEntity;
  dragging: boolean;
};

export const SidebarCategoryButtons = ({
  category,
  dragging,
}: SidebarCategoryButtonsProps) => {
  const notes = useNotes(category.id) || '';

  if (!notes) {
    return null;
  }

  return (
    <>
      <View style={{ flex: 1 }} />
      <View style={{ flexShrink: 0 }}>
        <NotesButton
          id={category.id}
          style={dragging ? { color: 'currentColor' } : undefined}
          defaultColor={theme.pageTextLight}
        />
      </View>
    </>
  );
};
