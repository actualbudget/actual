import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheckmark } from '@actual-app/components/icons/v1';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { OnboardingStep } from './OnboardingProvider';

type ChecklistItemProps = {
  step: OnboardingStep;
  index: number;
  onStart: () => void;
};

export function ChecklistItem({ step, index, onStart }: ChecklistItemProps) {
  const { t } = useTranslation();

  return (
    <View
      role="listitem"
      data-testid={`onboarding-step-${step.id}`}
      data-done={step.isDone}
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        padding: '10px 16px',
        borderTop: `1px solid ${theme.tableBorder}`,
      }}
    >
      <View
        aria-hidden
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          flexShrink: 0,
          marginTop: 1,
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          color: step.isDone ? theme.buttonPrimaryText : theme.pageTextLight,
          backgroundColor: step.isDone
            ? theme.buttonPrimaryBackground
            : theme.tableRowHeaderBackground,
        }}
      >
        {step.isDone ? <SvgCheckmark width={10} height={10} /> : index + 1}
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: step.isDone ? theme.pageTextLight : theme.pageText,
            textDecoration: step.isDone ? 'line-through' : 'none',
          }}
        >
          {step.title}
        </Text>
        {!step.isDone && (
          <Text
            style={{
              fontSize: 12,
              lineHeight: '1.4em',
              color: theme.pageTextLight,
            }}
          >
            {step.description}
          </Text>
        )}
      </View>
      <Button
        variant={step.isDone ? 'bare' : 'normal'}
        onPress={onStart}
        style={{ flexShrink: 0, fontSize: 12 }}
        aria-label={
          step.isDone
            ? t('Replay guide: {{title}}', { title: step.title })
            : t('Show me: {{title}}', { title: step.title })
        }
      >
        {step.isDone ? t('Replay') : t('Show me')}
      </Button>
    </View>
  );
}
