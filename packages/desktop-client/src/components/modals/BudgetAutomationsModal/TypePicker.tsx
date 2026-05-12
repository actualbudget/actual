import { useTranslation } from 'react-i18next';

import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { displayTemplateTypes } from '#components/budget/goals/constants';
import type { DisplayTemplateType } from '#components/budget/goals/constants';
import { getDisplayTemplateMeta } from '#components/budget/goals/displayTemplateMeta';

// Types managed in the Options sidebar section, not as contribution-type
// swaps.
export const NON_CONTRIBUTION_TYPES: ReadonlySet<DisplayTemplateType> = new Set(
  ['limit'],
);

type TypePickerProps = {
  active: DisplayTemplateType;
  disabledTypes: ReadonlySet<DisplayTemplateType>;
  onPick: (type: DisplayTemplateType) => void;
};

export function TypePicker({ active, disabledTypes, onPick }: TypePickerProps) {
  const { t } = useTranslation();
  const entries = displayTemplateTypes
    .filter(id => !NON_CONTRIBUTION_TYPES.has(id))
    .map(id => [id, getDisplayTemplateMeta(id)] as const);
  const disabledHint = t('Only one of this type allowed per category');

  return (
    <View
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 8,
      }}
    >
      {entries.map(([id, meta]) => {
        const Icon = meta.icon;
        const isActive = id === active;
        const isDisabled = !isActive && disabledTypes.has(id);
        return (
          <View
            key={id}
            role="button"
            tabIndex={isDisabled ? -1 : 0}
            aria-pressed={isActive}
            aria-disabled={isDisabled}
            title={isDisabled ? disabledHint : undefined}
            onClick={() => {
              if (!isDisabled) onPick(id);
            }}
            onKeyDown={e => {
              if (isDisabled) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onPick(id);
              }
            }}
            style={{
              padding: '10px 10px 8px',
              borderRadius: 6,
              backgroundColor: isActive
                ? theme.upcomingBackground
                : theme.cardBackground,
              border: `1px solid ${isActive ? theme.pageTextPositive : theme.tableBorder}`,
              gap: 6,
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              opacity: isDisabled ? 0.45 : 1,
              minWidth: 0,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Icon
                width={16}
                height={16}
                style={{
                  flexShrink: 0,
                  color: isActive ? theme.pageTextPositive : theme.pageText,
                }}
              />
              <Text
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: isActive ? theme.pageTextPositive : theme.pageText,
                  lineHeight: 1.25,
                }}
              >
                {meta.label}
              </Text>
            </View>
            <Text
              style={{
                display: 'block',
                fontSize: 11,
                color: theme.pageTextSubdued,
                lineHeight: 1.35,
              }}
            >
              {meta.description}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
