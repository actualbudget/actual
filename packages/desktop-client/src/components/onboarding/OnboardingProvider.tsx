import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import * as monthUtils from '@actual-app/core/shared/months';
import { q } from '@actual-app/core/shared/query';

import { useTour } from '#components/tour/TourProvider';
import type { TourId } from '#components/tour/TourProvider';
import { useAccounts } from '#hooks/useAccounts';
import { useIsTestEnv } from '#hooks/useIsTestEnv';
import { useLocalPref } from '#hooks/useLocalPref';
import { useQuery } from '#hooks/useQuery';
import { SheetNameProvider } from '#hooks/useSheetName';

import { TotalBudgetedProbe } from './TotalBudgetedProbe';

export type OnboardingStepId =
  | 'add-account'
  | 'add-transactions'
  | 'plan-budget'
  | 'add-schedule'
  | 'explore-reports';

export type OnboardingStep = {
  id: OnboardingStepId;
  title: string;
  description: string;
  /** The tour chapter that teaches this step. */
  tourId: TourId;
  /** Derived from the user's data: true once the step has really been done. */
  isDone: boolean;
};

type OnboardingContextValue = {
  steps: OnboardingStep[];
  completedCount: number;
  isAllDone: boolean;
  /** Whether the checklist launcher should be rendered at all. */
  isChecklistVisible: boolean;
  isChecklistExpanded: boolean;
  setChecklistExpanded: (expanded: boolean) => void;
  showChecklist: () => void;
  hideChecklist: () => void;
  /** Start the tour chapter for a step and collapse the checklist. */
  startStep: (stepId: OnboardingStepId) => void;
  completedTours: TourId[];
  markTourCompleted: (tourId: TourId) => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

type OnboardingProviderProps = {
  children: ReactNode;
};

/**
 * Tracks how far a new user has come in setting up their budget and drives
 * the "Getting started" checklist. Completion is derived from real data
 * (e.g. "has at least one account") rather than from whether a tour was
 * watched, so the checklist stays truthful when people skip the guide.
 */
export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const isTestEnv = useIsTestEnv();
  const location = useLocation();
  const { startTour } = useTour();

  const [completedTours = [], setCompletedTours] = useLocalPref(
    'onboarding.completedTours',
  );
  const [checklistHidden = false, setChecklistHidden] = useLocalPref(
    'onboarding.checklistHidden',
  );
  const [checklistExpanded = false, setChecklistExpandedPref] = useLocalPref(
    'onboarding.checklistExpanded',
  );
  const [reportsVisited = false, setReportsVisited] = useLocalPref(
    'onboarding.reportsVisited',
  );

  const { data: accounts } = useAccounts();
  const hasAccount = (accounts ?? []).some(account => !account.closed);

  const { data: transactions } = useQuery<{ id: string }>(
    () => q('transactions').select('id').limit(1),
    [],
  );
  const hasTransactions = (transactions ?? []).length > 0;

  const { data: schedules } = useQuery<{ id: string }>(
    () => q('schedules').select('id').limit(1),
    [],
  );
  const hasSchedule = (schedules ?? []).length > 0;

  const [totalBudgeted, setTotalBudgeted] = useState<number | null>(null);
  const hasBudgeted = typeof totalBudgeted === 'number' && totalBudgeted !== 0;

  // Persisting the pref is done in an effect: the local-storage setter is an
  // event callback and must not be invoked during render (which happens when
  // the app is loaded directly on a /reports URL).
  const isOnReports = location.pathname.startsWith('/reports');
  useEffect(() => {
    if (isOnReports && !reportsVisited) {
      setReportsVisited(true);
    }
  }, [isOnReports, reportsVisited, setReportsVisited]);

  const steps = useMemo<OnboardingStep[]>(
    () => [
      {
        id: 'add-account',
        title: t('Add an account'),
        description: t('Start with the checking account or card you use most.'),
        tourId: 'welcome-tour',
        isDone: hasAccount,
      },
      {
        id: 'add-transactions',
        title: t('Bring in transactions'),
        description: t('Import a file from your bank or add a few by hand.'),
        tourId: 'accounts-tour',
        isDone: hasTransactions,
      },
      {
        id: 'plan-budget',
        title: t("Plan this month's budget"),
        description: t('Give your money a job by assigning it to categories.'),
        tourId: 'budget-tour',
        isDone: hasBudgeted,
      },
      {
        id: 'add-schedule',
        title: t('Schedule a recurring bill'),
        description: t('Never be surprised by rent, subscriptions or salary.'),
        tourId: 'schedules-tour',
        isDone: hasSchedule,
      },
      {
        id: 'explore-reports',
        title: t('Explore your reports'),
        description: t('See where your money goes over time.'),
        tourId: 'reports-tour',
        isDone: reportsVisited,
      },
    ],
    [t, hasAccount, hasTransactions, hasBudgeted, hasSchedule, reportsVisited],
  );

  const completedCount = steps.filter(step => step.isDone).length;
  const isAllDone = completedCount === steps.length;

  const setChecklistExpanded = useCallback(
    (expanded: boolean) => setChecklistExpandedPref(expanded),
    [setChecklistExpandedPref],
  );

  const showChecklist = useCallback(() => {
    setChecklistHidden(false);
    setChecklistExpandedPref(true);
  }, [setChecklistHidden, setChecklistExpandedPref]);

  const hideChecklist = useCallback(() => {
    setChecklistHidden(true);
  }, [setChecklistHidden]);

  const markTourCompleted = useCallback(
    (tourId: TourId) => {
      if (!completedTours.includes(tourId)) {
        setCompletedTours([...completedTours, tourId]);
      }
    },
    [completedTours, setCompletedTours],
  );

  const startStep = useCallback(
    (stepId: OnboardingStepId) => {
      const step = steps.find(s => s.id === stepId);
      if (!step) {
        return;
      }
      setChecklistExpandedPref(false);
      startTour(step.tourId);
    },
    [steps, setChecklistExpandedPref, startTour],
  );

  // The checklist is for desktop users of budgets that are still being set
  // up. It is never shown during end-to-end tests unless explicitly opened.
  const isChecklistVisible =
    !isNarrowWidth && !checklistHidden && (!isTestEnv || checklistExpanded);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      steps,
      completedCount,
      isAllDone,
      isChecklistVisible,
      isChecklistExpanded: checklistExpanded,
      setChecklistExpanded,
      showChecklist,
      hideChecklist,
      startStep,
      completedTours: completedTours as TourId[],
      markTourCompleted,
    }),
    [
      steps,
      completedCount,
      isAllDone,
      isChecklistVisible,
      checklistExpanded,
      setChecklistExpanded,
      showChecklist,
      hideChecklist,
      startStep,
      completedTours,
      markTourCompleted,
    ],
  );

  return (
    <OnboardingContext.Provider value={value}>
      <SheetNameProvider
        name={monthUtils.sheetForMonth(monthUtils.currentMonth())}
      >
        <TotalBudgetedProbe onChange={setTotalBudgeted} />
      </SheetNameProvider>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
