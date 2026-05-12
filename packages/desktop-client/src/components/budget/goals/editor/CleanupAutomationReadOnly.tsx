import { Trans, useTranslation } from 'react-i18next';

import type { CleanupConfig } from '#components/budget/goals/cleanupModel';
import type { CleanupGroup } from '#hooks/useCleanupGroups';

type CleanupAutomationReadOnlyProps = {
  config: CleanupConfig;
  groups: CleanupGroup[];
};

export function CleanupAutomationReadOnly({
  config,
  groups,
}: CleanupAutomationReadOnlyProps) {
  const { t } = useTranslation();
  const isGlobal = config.global.send || config.global.take;
  const groupNames: string[] = [];
  for (const g of config.groups) {
    if (!g.send && !g.take) continue;
    const name =
      groups.find(x => x.id === g.groupId)?.name ?? t('Unknown group');
    groupNames.push(name);
  }

  const total = (isGlobal ? 1 : 0) + groupNames.length;
  if (total === 0) return <Trans>No cleanup configured</Trans>;
  if (total > 1) {
    const count = total;
    return <Trans count={count}>Active in {{ count }} scopes</Trans>;
  }
  if (isGlobal) return <Trans>Active globally</Trans>;
  const scope = groupNames[0];
  return <Trans>Active in {{ scope }}</Trans>;
}
