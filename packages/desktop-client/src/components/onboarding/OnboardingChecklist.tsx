import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { SvgCheckmark } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { ProgressBar } from '#components/common/ProgressBar';
import { useTour } from '#components/tour/TourProvider';

import { ChecklistItem } from './ChecklistItem';
import { useOnboarding } from './OnboardingProvider';

// Just below the notifications layer so toasts stay readable on top of it.
const CHECKLIST_Z_INDEX = 2950;

export const CHECKLIST_LAUNCHER_HEIGHT = 44;

/**
 * The "Getting started" checklist: a small panel in the corner of the app
 * that lists the handful of things a new budget needs, ticks them off as the
 * user completes them, and launches the matching guided tour chapter.
 */
export function OnboardingChecklist() {
  const { t } = useTranslation();
  const {
    steps,
    completedCount,
    isAllDone,
    isChecklistVisible,
    isChecklistExpanded,
    setChecklistExpanded,
    hideChecklist,
    startStep,
  } = useOnboarding();
  const { activeTourId, startTour } = useTour();

  // Keep out of the way while a tour is running.
  if (!isChecklistVisible || activeTourId != null) {
    return null;
  }

  const progress = steps.length === 0 ? 0 : completedCount / steps.length;

  if (!isChecklistExpanded) {
    return (
      <View
        data-testid="onboarding-launcher-container"
        style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: CHECKLIST_Z_INDEX,
          // The dismiss control is kept subtle until the launcher is hovered
          // or focused, so it does not compete with the main call to action.
          '& .onboarding-launcher-dismiss': {
            opacity: 0.55,
            transition: 'opacity .2s',
          },
          '&:hover .onboarding-launcher-dismiss, &:focus-within .onboarding-launcher-dismiss':
            {
              opacity: 1,
            },
        }}
      >
        <Button
          variant="normal"
          data-testid="onboarding-launcher"
          onPress={() => setChecklistExpanded(true)}
          aria-label={t('Open the getting started checklist')}
          className={css({
            height: CHECKLIST_LAUNCHER_HEIGHT,
            borderRadius: CHECKLIST_LAUNCHER_HEIGHT / 2,
            padding: '0 28px 0 14px',
            gap: 10,
            ...styles.shadowLarge,
          })}
        >
          <View
            aria-hidden
            style={{
              width: 22,
              height: 22,
              borderRadius: 11,
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: theme.buttonPrimaryText,
              backgroundColor: isAllDone
                ? theme.buttonPrimaryBackground
                : theme.buttonPrimaryBackground,
            }}
          >
            {isAllDone ? (
              <SvgCheckmark width={10} height={10} />
            ) : (
              `${completedCount}/${steps.length}`
            )}
          </View>
          <Text style={{ fontWeight: 600 }}>
            <Trans>Getting started</Trans>
          </Text>
        </Button>
        <Button
          variant="bare"
          className={css({
            position: 'absolute',
            top: '50%',
            right: 6,
            transform: 'translateY(-50%)',
            width: 18,
            height: 18,
            padding: 0,
            borderRadius: 9,
            color: theme.pageTextLight,
            ':hover': { color: theme.pageText },
          })}
          data-testid="onboarding-launcher-dismiss"
          aria-label={t('Dismiss the getting started checklist')}
          onPress={hideChecklist}
        >
          <SvgDelete
            className="onboarding-launcher-dismiss"
            width={7}
            height={7}
          />
        </Button>
      </View>
    );
  }

  return (
    <View
      role="dialog"
      aria-label={t('Getting started')}
      data-testid="onboarding-checklist"
      style={{
        ...styles.card,
        ...styles.shadowLarge,
        position: 'fixed',
        bottom: 16,
        right: 16,
        width: 360,
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100vh - 80px)',
        zIndex: CHECKLIST_Z_INDEX,
        overflow: 'hidden',
      }}
    >
      <View style={{ padding: '16px 16px 12px', gap: 10 }}>
        <View
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ ...styles.eyebrow, color: theme.pageTextPositive }}>
              <Trans>Getting started</Trans>
            </Text>
            <Text style={{ fontSize: 16, fontWeight: 700 }}>
              {isAllDone
                ? t("You're all set!")
                : t('Set up your budget in {{count}} steps', {
                    count: steps.length,
                  })}
            </Text>
            <Text
              style={{
                fontSize: 12,
                lineHeight: '1.4em',
                color: theme.pageTextLight,
              }}
            >
              {isAllDone
                ? t(
                    'You have covered the basics. Replay any guide below whenever you need a refresher.',
                  )
                : t(
                    'Each step opens a short guide that points at exactly what to click. Take them in any order.',
                  )}
            </Text>
          </View>
          <Button
            variant="bare"
            aria-label={t('Minimize')}
            onPress={() => setChecklistExpanded(false)}
            style={{ padding: 6, marginRight: -4, marginTop: -4 }}
          >
            <SvgDelete width={9} height={9} />
          </Button>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ProgressBar
            value={progress}
            color={theme.buttonPrimaryBackground}
            aria-label={t('{{completed}} of {{total}} steps done', {
              completed: completedCount,
              total: steps.length,
            })}
            style={{ flex: 1 }}
          />
          <Text
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: theme.pageTextLight,
              ...styles.tnum,
            }}
          >
            {t('{{completed}}/{{total}}', {
              completed: completedCount,
              total: steps.length,
            })}
          </Text>
        </View>
      </View>

      <View role="list" style={{ overflowY: 'auto' }}>
        {steps.map((step, index) => (
          <ChecklistItem
            key={step.id}
            step={step}
            index={index}
            onStart={() => startStep(step.id)}
          />
        ))}
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '10px 16px',
          borderTop: `1px solid ${theme.tableBorder}`,
          backgroundColor: theme.tableRowHeaderBackground,
        }}
      >
        <Button
          variant="bare"
          onPress={() => {
            setChecklistExpanded(false);
            startTour('welcome-tour');
          }}
          style={{ fontSize: 12, color: theme.pageTextLink }}
        >
          <Trans>Take the welcome tour</Trans>
        </Button>
        <Button
          variant="bare"
          onPress={hideChecklist}
          style={{ fontSize: 12, color: theme.pageTextLight }}
          data-testid="onboarding-hide"
        >
          <Trans>Hide checklist</Trans>
        </Button>
      </View>
    </View>
  );
}
