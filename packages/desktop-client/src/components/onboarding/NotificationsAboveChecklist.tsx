import { Notifications } from '#components/Notifications';

import { CHECKLIST_LAUNCHER_HEIGHT } from './OnboardingChecklist';
import { useOnboarding } from './OnboardingProvider';

export function NotificationsAboveChecklist() {
  const { isChecklistVisible, isChecklistExpanded } = useOnboarding();
  const offset =
    isChecklistVisible && !isChecklistExpanded
      ? CHECKLIST_LAUNCHER_HEIGHT + 28
      : undefined;
  return <Notifications style={offset ? { bottom: offset } : undefined} />;
}
