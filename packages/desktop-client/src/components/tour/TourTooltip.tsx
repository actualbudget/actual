import { useTranslation } from 'react-i18next';
import type { TooltipRenderProps } from 'react-joyride';

import { SvgDelete } from '@actual-app/components/icons/v0';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { TourStepData } from './steps';
import { TourTooltipButton } from './TourTooltipButton';

export function TourTooltip({
  backProps,
  closeProps,
  index,
  isLastStep,
  primaryProps,
  size,
  skipProps,
  step,
  tooltipProps,
}: TooltipRenderProps) {
  const { t } = useTranslation();
  const data = (step.data ?? {}) as Partial<TourStepData>;

  return (
    <View
      {...tooltipProps}
      data-testid="tour-tooltip"
      style={{
        backgroundColor: theme.menuBackground,
        border: `1px solid ${theme.cardBorder}`,
        borderRadius: 12,
        color: theme.pageText,
        maxWidth: 380,
        padding: '18px 20px 16px',
        ...styles.shadowLarge,
      }}
    >
      <TourTooltipButton
        handleProps={closeProps}
        style={{
          color: theme.pageTextSubdued,
          padding: 6,
          position: 'absolute',
          right: 8,
          top: 8,
        }}
      >
        <SvgDelete style={{ width: 9, height: 9 }} />
      </TourTooltipButton>

      {data.chapter && (
        <Text
          data-testid="tour-chapter"
          style={{
            ...styles.eyebrow,
            color: theme.pageTextPositive,
            marginBottom: 6,
            paddingRight: 24,
          }}
        >
          {data.chapter}
        </Text>
      )}

      {step.title != null && (
        <Text
          style={{
            fontSize: 16,
            fontWeight: 700,
            marginBottom: 6,
            paddingRight: 24,
          }}
        >
          {step.title}
        </Text>
      )}

      <Text style={{ lineHeight: '1.5em', fontSize: 13 }}>{step.content}</Text>

      {data.interactive && (
        <Text
          style={{
            marginTop: 10,
            fontSize: 12,
            color: theme.pageTextLight,
            fontStyle: 'italic',
          }}
        >
          {t('Go ahead and click it — the guide will wait.')}
        </Text>
      )}

      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: 8,
          marginTop: 16,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            flex: 1,
          }}
          aria-hidden
        >
          {Array.from({ length: size }).map((_, i) => (
            <View
              key={i}
              style={{
                width: i === index ? 16 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor:
                  i <= index
                    ? theme.buttonPrimaryBackground
                    : theme.tableRowHeaderBackground,
                transition: 'width .2s',
              }}
            />
          ))}
        </View>
        <Text
          data-testid="tour-progress"
          style={{ color: theme.pageTextSubdued, fontSize: 12, marginRight: 4 }}
        >
          {t('{{current}} of {{total}}', {
            current: index + 1,
            total: size,
          })}
        </Text>
        {!isLastStep && (
          <TourTooltipButton
            handleProps={skipProps}
            style={{ color: theme.pageTextSubdued }}
          />
        )}
        {index > 0 && <TourTooltipButton handleProps={backProps} />}
        <TourTooltipButton handleProps={primaryProps} variant="primary">
          {isLastStep
            ? primaryProps.title
            : data.interactive
              ? t('Do it later')
              : primaryProps.title}
        </TourTooltipButton>
      </View>
    </View>
  );
}
