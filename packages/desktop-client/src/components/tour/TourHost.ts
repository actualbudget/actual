import { useEffect, useEffectEvent, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useJoyride } from 'react-joyride';
import type { Controls, EventData } from 'react-joyride';

import { theme } from '@actual-app/components/theme';

import { useLocalPref } from '#hooks/useLocalPref';
import { useModalState } from '#hooks/useModalState';
import { useNavigate } from '#hooks/useNavigate';
import { useReducedMotion } from '#hooks/useReducedMotion';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { removeNotification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';

import { ADD_ACCOUNT_STEP_ID, getTourSteps } from './steps';
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
  const [, setIntroSeen] = useLocalPref('tour.introSeen');
  const { activeModal, modalStack } = useModalState();
  const reducedMotion = useReducedMotion();
  const navigate = useNavigate();
  const [budgetTypePref] = useSyncedPref('budgetType');
  const pausedAtIndexRef = useRef<number | null>(null);

  const steps = getTourSteps(tourId, {
    navigate,
    budgetType: budgetTypePref === 'tracking' ? 'tracking' : 'envelope',
  });

  const completeTour = () => {
    setIntroSeen(true);
    stopTour();
  };

  const handleEvent = (data: EventData, controls: Controls) => {
    if (data.type === 'error:target_not_found') {
      controls.next();
    } else if (
      data.type === 'tour:end' &&
      (data.status === 'finished' || data.status === 'skipped')
    ) {
      completeTour();
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
      closeButtonAction: 'skip',
      dismissKeyAction: 'close',
      overlayClickAction: false,
      overlayColor: 'rgba(0, 0, 0, 0.5)',
      scrollDuration: reducedMotion ? 0 : 300,
      skipBeacon: true,
      spotlightPadding: 6,
      targetWaitTimeout: 5000,
      textColor: theme.pageText,
      zIndex: TOUR_Z_INDEX,
    },
    styles: reducedMotion ? { floater: { transition: 'none' } } : undefined,
  });

  useEffect(() => {
    dispatch(removeNotification({ id: TOUR_OFFER_NOTIFICATION_ID }));
  }, [dispatch]);

  const syncTourWithModals = useEffectEvent((modalCount: number) => {
    if (modalCount > 0) {
      const state = controls.info();
      if (state.status !== 'running') {
        return;
      }
      if (
        activeModal === 'add-account' &&
        steps[state.index]?.id === ADD_ACCOUNT_STEP_ID
      ) {
        completeTour();
        return;
      }
      pausedAtIndexRef.current = state.index;
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
