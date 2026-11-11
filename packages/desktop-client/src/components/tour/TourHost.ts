import { useEffect, useEffectEvent, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useJoyride } from 'react-joyride';
import type { Controls, EventData } from 'react-joyride';

import { theme } from '@actual-app/components/theme';

import { useOnboarding } from '#components/onboarding/OnboardingProvider';
import { useAccounts } from '#hooks/useAccounts';
import { useLocalPref } from '#hooks/useLocalPref';
import { useModalState } from '#hooks/useModalState';
import { useNavigate } from '#hooks/useNavigate';
import { useReducedMotion } from '#hooks/useReducedMotion';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { useSyncServerStatus } from '#hooks/useSyncServerStatus';
import { removeNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

import { getTourSteps, NAVIGATION_WAIT_MS } from './steps';
import { TOUR_OFFER_NOTIFICATION_ID, useTour } from './TourProvider';
import type { TourId } from './TourProvider';
import { TourTooltip } from './TourTooltip';

// Must stay below MODAL_Z_INDEX (3000) and the notifications layer (2999).
const TOUR_Z_INDEX = 2900;

type TourHostProps = {
  tourId: TourId;
};

export function TourHost({ tourId }: TourHostProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { stopTour } = useTour();
  const { markTourCompleted } = useOnboarding();
  const [, setIntroSeen] = useLocalPref('tour.introSeen');
  const { modalStack } = useModalState();
  const reducedMotion = useReducedMotion();
  const navigate = useNavigate();
  const [budgetTypePref] = useSyncedPref('budgetType');
  const { data: accounts = [] } = useAccounts();
  const syncServerStatus = useSyncServerStatus();
  const pausedAtIndexRef = useRef<number | null>(null);

  const firstAccount =
    accounts.find(account => !account.closed && !account.offbudget) ??
    accounts.find(account => !account.closed);

  const steps = getTourSteps(tourId, {
    navigate,
    t,
    budgetType: budgetTypePref === 'tracking' ? 'tracking' : 'envelope',
    firstAccountId: firstAccount?.id,
    hasServer: syncServerStatus !== 'no-server',
  });

  const finishTour = (completed: boolean) => {
    setIntroSeen(true);
    if (completed) {
      markTourCompleted(tourId);
    }
    stopTour();
  };

  const handleEvent = (data: EventData, controls: Controls) => {
    if (data.type === 'error:target_not_found') {
      // A step's element is not on screen (e.g. an optional button). Skip
      // the step rather than leaving the user stuck.
      controls.next();
    } else if (data.type === 'tour:end') {
      if (data.status === 'finished') {
        finishTour(true);
      } else if (data.status === 'skipped') {
        finishTour(false);
      }
    } else if (data.action === 'close' && data.origin === 'keyboard') {
      controls.skip();
    }
  };

  const { controls, Tour } = useJoyride({
    continuous: true,
    run: true,
    steps,
    onEvent: handleEvent,
    tooltipComponent: TourTooltip,
    locale: {
      back: t('Back'),
      close: t('Close'),
      last: t('Finish'),
      next: t('Next'),
      skip: t('Skip tour'),
    },
    options: {
      arrowColor: theme.menuBackground,
      backgroundColor: theme.menuBackground,
      beforeTimeout: NAVIGATION_WAIT_MS + 3000,
      closeButtonAction: 'skip',
      dismissKeyAction: 'close',
      overlayClickAction: false,
      overlayColor: 'rgba(28, 27, 25, 0.45)',
      scrollDuration: reducedMotion ? 0 : 300,
      skipBeacon: true,
      spotlightPadding: 6,
      spotlightRadius: 8,
      targetWaitTimeout: 5000,
      textColor: theme.pageText,
      zIndex: TOUR_Z_INDEX,
    },
    styles: reducedMotion ? { floater: { transition: 'none' } } : undefined,
  });

  useEffect(() => {
    dispatch(removeNotification({ id: TOUR_OFFER_NOTIFICATION_ID }));
  }, [dispatch]);

  // Modals (like "Add account") sit above the tour, so pause while one is
  // open and pick up again once it closes. Steps that asked the user to open
  // the modal ("click Add account") resume on the following step, because
  // the user has just done what the step asked.
  const syncTourWithModals = useEffectEvent((modalCount: number) => {
    if (modalCount > 0) {
      const state = controls.info();
      if (state.status !== 'running') {
        return;
      }
      const step = steps[state.index];
      const isInteractiveStep = step?.data?.interactive === true;
      const resumeAt = isInteractiveStep ? state.index + 1 : state.index;
      pausedAtIndexRef.current = Math.min(resumeAt, steps.length - 1);
      controls.stop();
    } else if (pausedAtIndexRef.current != null) {
      const resumeIndex = pausedAtIndexRef.current;
      pausedAtIndexRef.current = null;
      controls.start(resumeIndex);
    }
  });

  const modalCount = modalStack.length;
  useEffect(() => syncTourWithModals(modalCount), [modalCount]);

  return Tour;
}
