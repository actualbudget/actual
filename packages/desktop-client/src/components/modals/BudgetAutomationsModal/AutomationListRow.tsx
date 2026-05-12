import { useTranslation } from 'react-i18next';

import { SvgAlertTriangle } from '@actual-app/components/icons/v2';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { AutomationEntry } from '#components/budget/goals/automationExamples';
import { AutomationErrorShort } from '#components/budget/goals/automationMessages';
import { getDisplayTemplateMeta } from '#components/budget/goals/displayTemplateMeta';
import { LimitAutomationShort } from '#components/budget/goals/editor/LimitAutomationShort';
import { TemplateSentence } from '#components/budget/goals/TemplateSentence';
import type { AutomationErrorKind } from '#components/budget/goals/validateAutomation';
import { useFormat } from '#hooks/useFormat';

import { NON_CONTRIBUTION_TYPES } from './TypePicker';

type AutomationListRowProps = {
  index: number;
  entry: AutomationEntry;
  isActive: boolean;
  error: AutomationErrorKind | null;
  contribution: number | null;
  categoryNameMap: Record<string, string>;
  onSelect: (index: number) => void;
};

export function AutomationListRow({
  index,
  entry,
  isActive,
  error,
  contribution,
  categoryNameMap,
  onSelect,
}: AutomationListRowProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const meta = getDisplayTemplateMeta(entry.displayType);
  const Icon = meta.icon;

  const subtitle = error ? (
    <AutomationErrorShort error={error} />
  ) : entry.template.type === 'limit' ? (
    <LimitAutomationShort template={entry.template} />
  ) : (
    <TemplateSentence
      template={entry.template}
      categoryNameMap={categoryNameMap}
    />
  );

  const borderColor = isActive
    ? theme.tableBorderSelected
    : error
      ? theme.errorBorder
      : 'transparent';
  const backgroundColor = isActive
    ? theme.upcomingBackground
    : error
      ? theme.errorBackground
      : 'transparent';
  const titleColor = error ? theme.errorText : theme.pageText;
  const subtitleColor = error ? theme.errorText : theme.pageTextSubdued;
  const priority =
    'priority' in entry.template && typeof entry.template.priority === 'number'
      ? entry.template.priority
      : null;

  return (
    <View
      onClick={() => onSelect(index)}
      aria-label={t('Select automation')}
      style={{
        flexShrink: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 10,
        marginBottom: 4,
        borderRadius: 6,
        border: `1px solid ${borderColor}`,
        backgroundColor,
        cursor: 'pointer',
        position: 'relative',
      }}
    >
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 6,
          backgroundColor: error
            ? theme.errorBackground
            : isActive
              ? theme.upcomingBackground
              : theme.pillBackground,
          color: error
            ? theme.errorText
            : isActive
              ? theme.pageTextPositive
              : theme.pageTextSubdued,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon width={14} height={14} style={{ color: 'inherit' }} />
      </View>
      <View style={{ minWidth: 0, flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            fontSize: 12,
            fontWeight: 600,
            color: titleColor,
          }}
        >
          <Text>{meta.label}</Text>
          {error && (
            <SvgAlertTriangle
              width={11}
              height={11}
              style={{ color: 'inherit' }}
            />
          )}
        </View>
        <Text
          style={{
            fontSize: 11,
            color: subtitleColor,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'block',
          }}
        >
          {subtitle}
        </Text>
      </View>
      {!NON_CONTRIBUTION_TYPES.has(entry.displayType) && (
        <View
          style={{
            flexShrink: 0,
            alignItems: 'flex-end',
            gap: 2,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              color:
                contribution == null ||
                Number.isNaN(contribution) ||
                contribution === 0
                  ? theme.pageTextSubdued
                  : theme.pageText,
            }}
          >
            {contribution == null || Number.isNaN(contribution)
              ? '—'
              : contribution > 0
                ? '+' + format(contribution, 'financial')
                : format(contribution, 'financial')}
          </Text>
          {priority != null && (
            <Text
              style={{
                fontSize: 10,
                color: theme.pageTextSubdued,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '0.04em',
              }}
            >
              {t('Priority: {{priority}}', { priority })}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
