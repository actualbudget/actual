import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { CategoryEntity } from 'loot-core/types/models/category';

import { CategoryAutomationButton } from './goals/CategoryAutomationButton';

import { NotesButton } from '@desktop-client/components/NotesButton';
import { useFeatureFlag } from '@desktop-client/hooks/useFeatureFlag';
import { useNotes } from '@desktop-client/hooks/useNotes';

type SidebarCategoryButtonsProps = {
  category: CategoryEntity;
  dragging: boolean;
  goalsShown: boolean;
};

export const SidebarCategoryButtons = ({
  category,
  dragging,
  goalsShown,
}: SidebarCategoryButtonsProps) => {
  const isGoalTemplatesUIEnabled = useFeatureFlag('goalTemplatesUIEnabled');
  const notes = useNotes(category.id) || '';

  return (
    <>
      <View style={{ flex: 1 }} />
      {!goalsShown && isGoalTemplatesUIEnabled && (
        <View style={{ flexShrink: 0 }}>
          <CategoryAutomationButton
            category={category}
            style={dragging ? { color: 'currentColor' } : undefined}
            defaultColor={theme.pageTextLight}
            showPlaceholder={!!notes}
          />
        </View>
      )}
      <View style={{ flexShrink: 0 }}>
        <NotesButton
          id={category.id}
          style={dragging ? { color: 'currentColor' } : undefined}
          defaultColor={theme.pageTextLight}
          showPlaceholder={
            !goalsShown &&
            isGoalTemplatesUIEnabled &&
            !!category.goal_def?.length
          }
        />
      </View>
    </>
  );
};
