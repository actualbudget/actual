import { Trans, useTranslation } from 'react-i18next';

import { SvgRefresh } from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { CleanupConfig } from '#components/budget/goals/cleanupModel';
import { CleanupAutomationReadOnly } from '#components/budget/goals/editor/CleanupAutomationReadOnly';
import type { CleanupGroup } from '#hooks/useCleanupGroups';

type CleanupListRowProps = {
  config: CleanupConfig;
  groups: CleanupGroup[];
  isActive: boolean;
  onSelect: () => void;
};

export function CleanupListRow({
  config,
  groups,
  isActive,
  onSelect,
}: CleanupListRowProps) {
  const { t } = useTranslation();
  const borderColor = isActive ? theme.tableBorderSelected : 'transparent';
  const backgroundColor = isActive ? theme.upcomingBackground : 'transparent';

  return (
    <View
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      aria-label={t('Select cleanup')}
      style={{
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 10,
        borderRadius: 6,
        border: `1px solid ${borderColor}`,
        backgroundColor,
        cursor: 'pointer',
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          backgroundColor: isActive
            ? theme.upcomingBackground
            : theme.pillBackground,
          color: isActive ? theme.pageTextPositive : theme.pageTextSubdued,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <SvgRefresh width={14} height={14} style={{ color: 'inherit' }} />
      </View>
      <View style={{ minWidth: 0, flex: 1 }}>
        <Text
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: theme.pageText,
            display: 'block',
          }}
        >
          <Trans>End of month cleanup</Trans>
        </Text>
        <Text
          style={{
            fontSize: 11,
            color: theme.pageTextSubdued,
            display: 'block',
          }}
        >
          <CleanupAutomationReadOnly config={config} groups={groups} />
        </Text>
      </View>
    </View>
  );
}
