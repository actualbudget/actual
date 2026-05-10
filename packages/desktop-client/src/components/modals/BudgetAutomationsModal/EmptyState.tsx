import { Trans } from 'react-i18next';

import { SvgAlertTriangle } from '@actual-app/components/icons/v2';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { getAutomationExamples } from '#components/budget/goals/automationExamples';
import type { AutomationEntry } from '#components/budget/goals/automationExamples';
import { getDisplayTemplateMeta } from '#components/budget/goals/displayTemplateMeta';

type EmptyStateProps = {
  onAdd: (create: () => AutomationEntry) => void;
};

export function EmptyState({ onAdd }: EmptyStateProps) {
  const examples = getAutomationExamples();

  return (
    <View
      style={{
        padding: '40px 20px',
        textAlign: 'center',
        maxWidth: 540,
        margin: '0 auto',
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          margin: '0 auto 14px',
          backgroundColor: theme.upcomingBackground,
          color: theme.pageTextPositive,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SvgAlertTriangle width={20} height={20} style={{ color: 'inherit' }} />
      </View>
      <Text
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: theme.pageText,
          letterSpacing: '-0.01em',
        }}
      >
        <Trans>No automations yet</Trans>
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: theme.pageTextSubdued,
          marginTop: 4,
          marginBottom: 22,
          display: 'block',
        }}
      >
        <Trans>
          Budget automations keep this category funded with one click each
          month. Start with one of these.
        </Trans>
      </Text>
      <View
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 10,
          textAlign: 'center',
        }}
      >
        {examples.map(example => {
          const meta = getDisplayTemplateMeta(example.displayType);
          const Icon = meta.icon;
          return (
            <View
              key={example.displayType}
              role="button"
              tabIndex={0}
              aria-label={meta.label}
              onClick={() => onAdd(example.create)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onAdd(example.create);
                }
              }}
              style={{
                padding: 14,
                borderRadius: 8,
                backgroundColor: theme.cardBackground,
                border: `1px solid ${theme.tableBorder}`,
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  backgroundColor: theme.upcomingBackground,
                  color: theme.pageTextPositive,
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignSelf: 'center',
                  marginBottom: 6,
                }}
              >
                <Icon width={16} height={16} />
              </View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: theme.pageText,
                }}
              >
                {meta.label}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: theme.pageTextSubdued,
                  lineHeight: 1.4,
                }}
              >
                {meta.description}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
