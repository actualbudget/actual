import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { CategoryEntity } from '@actual-app/core/types/models/category';

import { NotesButton } from '#components/NotesButton';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useNotes } from '#hooks/useNotes';

import { CategoryAutomationButton } from './goals/CategoryAutomationButton';

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
  const showAutomationButton = !goalsShown && isGoalTemplatesUIEnabled;

  const hasAutomations =
    !!category.goal_def?.length || !!category.cleanup_def?.length;
  const hasNotes = !!useNotes(category.id);

  const slotStyle = { flexShrink: 0, width: 24, alignItems: 'center' } as const;

  const automationSlot = showAutomationButton ? (
    <View key="automation" style={slotStyle}>
      <CategoryAutomationButton
        category={category}
        style={dragging ? { color: 'currentColor' } : undefined}
        defaultColor={theme.pageTextLight}
      />
    </View>
  ) : null;

  const notesSlot = (
    <View key="notes" style={slotStyle}>
      <NotesButton
        id={category.id}
        style={dragging ? { color: 'currentColor' } : undefined}
        defaultColor={theme.pageTextLight}
      />
    </View>
  );

  // anchor whichever icon has persistent content on the right; the
  // hover-revealed one slides in on its left so the persistent one
  // doesn't shift position when hover starts
  const reverseOrder =
    showAutomationButton && hasAutomations !== hasNotes && hasAutomations;

  return (
    <>
      <View style={{ flex: 1 }} />
      {reverseOrder ? (
        <>
          {notesSlot}
          {automationSlot}
        </>
      ) : (
        <>
          {automationSlot}
          {notesSlot}
        </>
      )}
    </>
  );
};
