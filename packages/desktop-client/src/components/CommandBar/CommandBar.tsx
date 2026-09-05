import { useCallback, useEffect, useState } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { Button } from '@actual-app/components/button';
import {
  SvgAdd,
  SvgArrowLeft,
  SvgBookmarkOutlineAdd,
  SvgClose,
  SvgCog,
  SvgKeyboard,
  SvgLibrary,
  SvgLockOpen,
  SvgReports,
  SvgStoreFront,
  SvgSwap,
  SvgTag,
  SvgTuning,
  SvgWallet,
  SvgWindowOpen,
} from '@actual-app/components/icons/v1';
import {
  SvgArrowsSynchronize,
  SvgCalendar3,
  SvgDownloadThickBottom,
  SvgHelp,
  SvgMoonStars,
  SvgNotesPaperText,
  SvgRemoveAlternate,
  SvgSearchAlternate,
  SvgViewHide,
  SvgViewShow,
} from '@actual-app/components/icons/v2';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import type {
  AccountEntity,
  CustomReportEntity,
} from '@actual-app/core/types/models';
import type { Theme } from '@actual-app/core/types/prefs';
import { css, cx } from '@emotion/css';
import { Command } from 'cmdk';
import { format } from 'date-fns';

import {
  useReopenAccountMutation,
  useSyncAndDownloadMutation,
} from '#accounts';
import { useAccountSyncStatus } from '#accounts/useAccountSyncStatus';
import { closeBudget } from '#budgetfiles/budgetfilesSlice';
import {
  favoriteRefKey,
  parseCommandBarFavorites,
  updateCommandBarFavorites,
} from '#commandbar/commandBarFavorites';
import type { CommandBarFavoriteRef } from '#commandbar/commandBarFavorites';
import {
  commandBarRecentPath,
  commandBarRecentRefKey,
  getCommandBarRecentRef,
} from '#commandbar/commandBarRecent';
import type { CommandBarRecentRef } from '#commandbar/commandBarRecent';
import { useCommandBarCommands } from '#commandbar/commandBarRegistry';
import {
  closeCommandBar,
  openCommandBar,
  setCommandBarOpen,
} from '#commandbar/commandBarSlice';
import { AccountStatusIndicator } from '#components/accounts/AccountStatusIndicator';
import { useTour } from '#components/tour/TourProvider';
import { useAccounts } from '#hooks/useAccounts';
import { useDashboardPages } from '#hooks/useDashboardPages';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { useLocalPref } from '#hooks/useLocalPref';
import { useMetadataPref } from '#hooks/useMetadataPref';
import { useModalState } from '#hooks/useModalState';
import { useNavigate } from '#hooks/useNavigate';
import { useReports } from '#hooks/useReports';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { openAccountCloseModal, pushModal } from '#modals/modalsSlice';
import { addNotification } from '#notifications/notificationsSlice';
import { useDispatch, useSelector } from '#redux';
import {
  accountBalance,
  allAccountBalance,
  offBudgetAccountBalance,
  onBudgetAccountBalance,
} from '#spreadsheet/bindings';
import { useTheme } from '#style';
import type { CatalogTheme, InstalledTheme } from '#style/customThemes';
import {
  embedThemeFonts,
  fetchThemeCss,
  generateThemeId,
  normalizeGitHubRepo,
  parseInstalledTheme,
  serializeInstalledTheme,
  validateThemeCss,
} from '#style/customThemes';

import { ActionPage } from './ActionPage';
import {
  BalanceRow,
  FooterHint,
  Highlight,
  KeyChip,
  ShortcutHint,
} from './primitives';
import {
  actionItemClassName,
  destructiveActionClassName,
  dialogEnter,
  overlayEnter,
  pageEnterClassName,
  paletteGroupClassName,
  paletteItemClassName,
} from './styles';
import { ThemePage } from './ThemePage';
import type {
  ActionItem,
  ActionPageHeader,
  ActionSection,
  ActionTrigger,
  FavoriteControl,
  QuickAction,
  SearchSection,
} from './types';

type Page =
  | 'root'
  | 'themes'
  | 'account-actions'
  | 'report-actions'
  | 'actions';

type ContextualItem =
  | { type: 'account'; item: AccountEntity }
  | { type: 'report'; item: CustomReportEntity };

type ResolvedRecentItem = Readonly<{
  ref: CommandBarRecentRef;
  key: string;
  path: string;
  name: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}>;

function isMacPlatform() {
  return (
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent)
  );
}

function contextualFavoriteRef(item: ContextualItem): CommandBarFavoriteRef {
  return {
    type: item.type === 'account' ? 'account' : 'report',
    id: item.item.id,
  };
}

export function CommandBar() {
  const { t } = useTranslation();
  const open = useSelector(state => state.commandBar.open);
  const [search, setSearch] = useState('');
  // 'themes' is a nested palette page (VS Code-style): the "Change theme…"
  // action transitions into it; esc / backspace-on-empty goes back.
  const [page, setPage] = useState<Page>('root');
  const [contextualItem, setContextualItem] = useState<ContextualItem | null>(
    null,
  );
  const [actionPageRef, setActionPageRef] =
    useState<CommandBarFavoriteRef | null>(null);
  const [recentRefs, setRecentRefs] = useState<readonly CommandBarRecentRef[]>(
    [],
  );
  const [selectedValue, setSelectedValue] = useState('');
  const [rootSearch, setRootSearch] = useState('');
  const [rootSelectedValue, setRootSelectedValue] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const contributedCommands = useCommandBarCommands();
  const { mutate: syncAndDownload } = useSyncAndDownloadMutation();
  const reopenAccount = useReopenAccountMutation();
  const { startTour } = useTour();
  const [budgetName] = useMetadataPref('budgetName');
  const [storedFavorites, setStoredFavorites] = useLocalPref(
    'commandbar.favorites',
  );
  const { modalStack } = useModalState();
  const [isPrivacyEnabledPref, setPrivacyEnabledPref] =
    useSyncedPref('isPrivacyEnabled');
  const isPrivacyEnabled = String(isPrivacyEnabledPref) === 'true';

  const [currentTheme, switchTheme] = useTheme();
  const [installedLightThemeJson, setInstalledLightThemeJson] = useGlobalPref(
    'installedCustomLightTheme',
  );
  const [, setInstalledDarkThemeJson] = useGlobalPref(
    'installedCustomDarkTheme',
  );
  const installedCustomLightTheme = parseInstalledTheme(
    installedLightThemeJson,
  );
  // outside auto mode the light slot is the active custom theme (see
  // ThemeSettings.getCurrentValue)
  const activeCustomThemeId =
    currentTheme !== 'auto' && installedCustomLightTheme
      ? installedCustomLightTheme.id
      : null;

  // Only the *transition* between pages should animate — not the dialog's
  // initial open (which would otherwise replay the slide-in on every ⌘K).
  const [animatePageChange, setAnimatePageChange] = useState(false);

  const goBackToRoot = useCallback(() => {
    setPage('root');
    setContextualItem(null);
    setSearch(rootSearch);
    setSelectedValue(rootSelectedValue);
    setAnimatePageChange(true);
  }, [rootSearch, rootSelectedValue]);

  const applyBuiltinTheme = useCallback(
    (themeKey: Theme) => {
      // matches ThemeSettings.handleThemeChange: picking a built-in clears
      // any installed custom theme
      setInstalledLightThemeJson(serializeInstalledTheme(null));
      setInstalledDarkThemeJson(serializeInstalledTheme(null));
      switchTheme(themeKey);
      dispatch(closeCommandBar());
    },
    [
      dispatch,
      setInstalledLightThemeJson,
      setInstalledDarkThemeJson,
      switchTheme,
    ],
  );

  const applyCatalogTheme = useCallback(
    (catalogTheme: CatalogTheme) => {
      // close immediately; the theme flips once the download finishes
      dispatch(closeCommandBar());
      void (async () => {
        try {
          const normalizedRepo = normalizeGitHubRepo(catalogTheme.repo);
          const rawCss = await fetchThemeCss(catalogTheme.repo);
          const cssWithFonts = await embedThemeFonts(rawCss, catalogTheme.repo);
          const newTheme: InstalledTheme = {
            id: generateThemeId(normalizedRepo),
            name: catalogTheme.name,
            repo: normalizedRepo,
            cssContent: validateThemeCss(cssWithFonts),
            baseTheme: catalogTheme.mode === 'dark' ? 'dark' : 'light',
          };
          setInstalledLightThemeJson(serializeInstalledTheme(newTheme));
          // leaving auto makes the newly installed theme visible immediately
          if (currentTheme === 'auto') {
            switchTheme(newTheme.baseTheme ?? 'light');
          }
        } catch {
          dispatch(
            addNotification({
              notification: {
                type: 'error',
                message: t('Failed to load theme'),
              },
            }),
          );
        }
      })();
    },
    [currentTheme, dispatch, setInstalledLightThemeJson, switchTheme, t],
  );

  const exportBudget = useCallback(async () => {
    const response = await send('export-budget');
    if ('error' in response && response.error) {
      console.log('Export error code:', response.error);
      dispatch(
        addNotification({
          notification: {
            type: 'error',
            message: t(
              'An unknown error occurred while exporting. Please report this as a new issue on GitHub.',
            ),
          },
        }),
      );
      return;
    }
    if (response.data) {
      if (response.warnings?.includes('exceeds-import-size-limit')) {
        dispatch(
          addNotification({
            notification: {
              id: 'export-exceeds-import-size-limit',
              type: 'warning',
              sticky: true,
              message: t(
                'This export is larger than Actual can safely re-import. You may not be able to restore this backup.',
              ),
            },
          }),
        );
      }
      if (response.warnings?.includes('may-exceed-available-memory')) {
        dispatch(
          addNotification({
            notification: {
              id: 'export-may-exceed-available-memory',
              type: 'warning',
              sticky: true,
              message: t(
                'This export is larger than the memory available on this device. Restoring it here may fail.',
              ),
            },
          }),
        );
      }

      void window.Actual.saveFile(
        response.data,
        `${format(new Date(), 'yyyy-MM-dd')}-${budgetName}.zip`,
        t('Export budget'),
      );
    }
  }, [budgetName, dispatch, t]);

  // Not memoized: rows embed the current search (via <Highlight>), and the
  // component re-renders on every keystroke anyway.
  const navigationItems = [
    { id: 'budget', name: t('Budget'), path: '/budget', Icon: SvgWallet },
    {
      id: 'reports-nav',
      name: t('Reports'),
      path: '/reports',
      Icon: SvgReports,
    },
    {
      id: 'schedules',
      name: t('Schedules'),
      path: '/schedules',
      Icon: SvgCalendar3,
    },
    { id: 'payees', name: t('Payees'), path: '/payees', Icon: SvgStoreFront },
    { id: 'rules', name: t('Rules'), path: '/rules', Icon: SvgTuning },
    { id: 'tags', name: t('Tags'), path: '/tags', Icon: SvgTag },
    { id: 'settings', name: t('Settings'), path: '/settings', Icon: SvgCog },
    {
      id: 'accounts',
      name: t('All Accounts'),
      path: '/accounts',
      content: (
        <BalanceRow<'account', 'accounts-balance'>
          label={t('All Accounts')}
          binding={allAccountBalance()}
          query={search}
        />
      ),
      Icon: SvgLibrary,
    },
  ];

  useEffect(() => {
    // Reset search and page when closing
    if (!open) {
      setSearch('');
      setPage('root');
      setContextualItem(null);
      setActionPageRef(null);
      setSelectedValue('');
      setRootSearch('');
      setRootSelectedValue('');
      setAnimatePageChange(false);
    }
  }, [open]);

  const { data: allAccounts = [] } = useAccounts();
  const { data: customReports = [] } = useReports();
  const { data: dashboardPages = [] } = useDashboardPages();

  // Canonical root-group presentation for action-page subtitles. This is
  // resolved from the reference so Recent and Favorites retain their origin.
  function getRootSectionLabel(ref: CommandBarFavoriteRef): string {
    if (ref.type === 'navigation') return t('Navigation');
    if (ref.type === 'dashboard') return t('Reports');
    if (ref.type === 'report') return t('Custom Reports');
    if (ref.type === 'quick-action') return t('Quick actions');
    if (ref.type === 'page-action') return t('Page actions');
    if (ref.id === 'onbudget' || ref.id === 'offbudget') return t('Accounts');
    return allAccounts.find(account => account.id === ref.id)?.closed
      ? t('Closed Accounts')
      : t('Accounts');
  }

  useEffect(() => {
    const recentRef = getCommandBarRecentRef(location.pathname, {
      accounts: allAccounts,
      dashboardPages,
      customReports,
    });
    if (!recentRef) return;

    setRecentRefs(currentRefs => {
      const recentRefKey = commandBarRecentRefKey(recentRef);
      if (currentRefs[0] != null) {
        if (commandBarRecentRefKey(currentRefs[0]) === recentRefKey) {
          return currentRefs;
        }
      }

      return [
        recentRef,
        ...currentRefs.filter(
          currentRef => commandBarRecentRefKey(currentRef) !== recentRefKey,
        ),
      ].slice(0, 4);
    });
  }, [allAccounts, customReports, dashboardPages, location.pathname]);

  const accounts = allAccounts.filter(acc => !acc.closed);
  const closedAccounts = allAccounts.filter(acc => !!acc.closed);
  const getAccountSyncStatus = useAccountSyncStatus();
  const favoriteRefs = parseCommandBarFavorites(storedFavorites);
  const favoriteKeys = new Set(favoriteRefs.map(favoriteRefKey));
  const toggleFavorite = useCallback(
    (ref: CommandBarFavoriteRef) => {
      const eligibleFavoriteRefs: readonly CommandBarFavoriteRef[] = [
        ...allAccounts.map(account => ({
          type: 'account' as const,
          id: account.id,
        })),
        ...customReports.map(report => ({
          type: 'report' as const,
          id: report.id,
        })),
      ];
      setStoredFavorites(
        updateCommandBarFavorites(storedFavorites, eligibleFavoriteRefs, ref),
      );
    },
    [allAccounts, customReports, setStoredFavorites, storedFavorites],
  );
  const getContextualItem = useCallback(
    (value: string): ContextualItem | null => {
      const favoriteRef = favoriteRefs.find(
        ref => `favorites:${favoriteRefKey(ref)}` === value,
      );
      const favoriteKey = value.startsWith('favorites:')
        ? value.slice('favorites:'.length)
        : null;
      const favoriteAccountId =
        favoriteRef?.type === 'account'
          ? favoriteRef.id
          : favoriteKey?.startsWith('account:')
            ? favoriteKey.slice('account:'.length)
            : null;
      const favoriteReportId =
        favoriteRef?.type === 'report'
          ? favoriteRef.id
          : favoriteKey?.startsWith('report:')
            ? favoriteKey.slice('report:'.length)
            : null;
      if (favoriteAccountId != null) {
        const account = [...accounts, ...closedAccounts].find(
          item => item.id === favoriteAccountId,
        );
        if (account) return { type: 'account', item: account };
      }
      if (favoriteReportId != null) {
        const report = customReports.find(item => item.id === favoriteReportId);
        if (report) return { type: 'report', item: report };
      }

      const account = [...accounts, ...closedAccounts].find(
        item => `accounts${item.closed ? '-closed' : ''}:${item.id}` === value,
      );
      if (account) return { type: 'account', item: account };

      const report = customReports.find(
        item => `reports-custom:${item.id}` === value,
      );
      return report ? { type: 'report', item: report } : null;
    },
    [accounts, closedAccounts, customReports, favoriteRefs],
  );

  useEffect(() => {
    if (page !== 'account-actions' && page !== 'report-actions') return;
    if (actionPageRef == null) return;
    const liveItem = getContextualItem(
      `favorites:${favoriteRefKey(actionPageRef)}`,
    );
    if (liveItem == null) {
      goBackToRoot();
      return;
    }
    if (
      contextualItem?.item.id !== liveItem.item.id ||
      contextualItem.item.name !== liveItem.item.name ||
      ('closed' in contextualItem.item &&
        'closed' in liveItem.item &&
        contextualItem.item.closed !== liveItem.item.closed)
    ) {
      setContextualItem(liveItem);
    }
  }, [actionPageRef, contextualItem, getContextualItem, goBackToRoot, page]);

  const openEventListener = useCallback(
    (e: KeyboardEvent) => {
      if (e.key !== 'k' || (!e.metaKey && !e.ctrlKey) || open) return;

      e.preventDefault();
      // Do not open CommandBar if a modal is already open
      if (modalStack.length > 0) return;
      dispatch(openCommandBar());
    },
    [dispatch, modalStack.length, open],
  );

  useEffect(() => {
    document.addEventListener('keydown', openEventListener, true);
    return () =>
      document.removeEventListener('keydown', openEventListener, true);
  }, [openEventListener]);

  useEffect(() => {
    if (!open || page === 'root') return;

    function handleNestedPageEscape(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      goBackToRoot();
    }

    window.addEventListener('keydown', handleNestedPageEscape, true);
    return () =>
      window.removeEventListener('keydown', handleNestedPageEscape, true);
  }, [goBackToRoot, open, page]);

  const handleNavigate = useCallback(
    (path: string) => {
      dispatch(closeCommandBar());
      void navigate(path);
    },
    [dispatch, navigate],
  );

  // Built-in quick actions. Each one is wired to an existing app flow that
  // works from any page.
  const builtinQuickActions: QuickAction[] = [
    {
      id: 'sync-accounts',
      name: t('Sync all accounts'),
      Icon: SvgArrowsSynchronize,
      run: () => syncAndDownload({}),
    },
    {
      id: 'new-schedule',
      name: t('Create new schedule'),
      Icon: SvgCalendar3,
      run: () =>
        dispatch(pushModal({ modal: { name: 'schedule-edit', options: {} } })),
    },
    {
      id: 'new-custom-report',
      name: t('Create new custom report'),
      Icon: SvgNotesPaperText,
      run: () => void navigate('/reports/custom'),
    },
    {
      id: 'add-account',
      name: t('Add new account'),
      Icon: SvgAdd,
      run: () =>
        dispatch(pushModal({ modal: { name: 'add-account', options: {} } })),
    },
    {
      id: 'toggle-privacy',
      name: isPrivacyEnabled
        ? t('Disable privacy mode')
        : t('Enable privacy mode'),
      // icon previews the outcome: show values when disabling, hide when enabling
      Icon: isPrivacyEnabled ? SvgViewShow : SvgViewHide,
      run: () => setPrivacyEnabledPref(String(!isPrivacyEnabled)),
    },
    {
      id: 'change-theme',
      name: t('Change theme…'),
      Icon: SvgMoonStars,
      keepOpen: true,
      run: () => {
        setRootSearch(search);
        setRootSelectedValue(selectedValue);
        setPage('themes');
        setSearch('');
        setSelectedValue(`theme-builtin:${currentTheme}`);
        setAnimatePageChange(true);
      },
    },
    {
      id: 'keyboard-shortcuts',
      name: t('View keyboard shortcuts'),
      Icon: SvgKeyboard,
      run: () => dispatch(pushModal({ modal: { name: 'keyboard-shortcuts' } })),
    },
    {
      id: 'start-tour',
      name: t('Take a tour of {{appName}}', { appName: 'Actual' }),
      Icon: SvgHelp,
      run: startTour,
    },
    {
      id: 'export-budget',
      name: t('Export budget data'),
      Icon: SvgDownloadThickBottom,
      run: () => void exportBudget(),
    },
    {
      id: 'switch-budget-file',
      name: t('Switch budget file'),
      Icon: SvgSwap,
      run: () => void dispatch(closeBudget()),
    },
  ];
  const quickActions: QuickAction[] = builtinQuickActions;

  const runContextualAction = useCallback(
    (action: ActionItem, trigger: ActionTrigger) => {
      if (trigger === 'secondary' && action.destructive) return;

      const execution =
        trigger === 'secondary' ? action.secondaryAction : action.primaryAction;
      if (execution == null) return;

      if (action.id === 'favorite') {
        void execution.run();
        return;
      }

      // Contextual actions always close before they navigate, open a modal, or
      // start a mutation. This also keeps the palette from sitting above the
      // flow it just launched.
      if (!action.keepOpen) dispatch(closeCommandBar());
      void (async () => {
        try {
          await execution.run();
        } catch (error) {
          console.error('Command bar action failed', {
            commandId: action.id,
            error,
          });
        }
      })();
    },
    [dispatch],
  );

  const contextualFavoriteControl: FavoriteControl | undefined =
    contextualItem == null
      ? undefined
      : (() => {
          const ref = contextualFavoriteRef(contextualItem);
          return {
            isPressed: favoriteKeys.has(favoriteRefKey(ref)),
            onToggle: () => toggleFavorite(ref),
            addLabel: t('Add to favorites'),
            removeLabel: t('Remove from favorites'),
          };
        })();

  const contextualHeader: ActionPageHeader | null = contextualItem
    ? contextualItem.type === 'account'
      ? {
          name: contextualItem.item.name,
          typeLabel: getRootSectionLabel({
            type: 'account',
            id: contextualItem.item.id,
          }),
          Icon: SvgLibrary,
          favorite: contextualFavoriteControl,
        }
      : {
          name: contextualItem.item.name,
          typeLabel: getRootSectionLabel({
            type: 'report',
            id: contextualItem.item.id,
          }),
          Icon: SvgNotesPaperText,
          favorite: contextualFavoriteControl,
        }
    : null;

  const contextualActionSections: readonly ActionSection[] =
    contextualItem?.type === 'account'
      ? [
          {
            key: 'primary',
            heading: t('Primary'),
            items: [
              {
                id: 'open',
                name: t('Open'),
                Icon: SvgWindowOpen,
                primaryAction: {
                  label: t('Open'),
                  run: async () => {
                    await navigate(`/accounts/${contextualItem.item.id}`);
                  },
                },
                ...(contextualItem.item.closed
                  ? {
                      secondaryAction: {
                        label: t('Reopen account'),
                        run: () =>
                          reopenAccount.mutateAsync({
                            id: contextualItem.item.id,
                          }),
                      },
                    }
                  : {}),
              },
            ],
          },
          {
            key: 'additional',
            heading: t('Additional'),
            items: [
              contextualItem.item.closed
                ? {
                    id: 'reopen',
                    name: t('Reopen account'),
                    Icon: SvgLockOpen,
                    primaryAction: {
                      label: t('Reopen account'),
                      run: () =>
                        reopenAccount.mutateAsync({
                          id: contextualItem.item.id,
                        }),
                    },
                  }
                : {
                    id: 'close',
                    name: t('Close account'),
                    Icon: SvgClose,
                    destructive: true,
                    primaryAction: {
                      label: t('Close account'),
                      run: async () => {
                        await dispatch(
                          openAccountCloseModal({
                            accountId: contextualItem.item.id,
                          }),
                        );
                      },
                    },
                  },
            ],
          },
        ]
      : contextualItem?.type === 'report'
        ? [
            {
              key: 'primary',
              heading: t('Primary'),
              items: [
                {
                  id: 'open',
                  name: t('Open'),
                  Icon: SvgWindowOpen,
                  primaryAction: {
                    label: t('Open'),
                    run: async () => {
                      await navigate(
                        `/reports/custom/${contextualItem.item.id}`,
                      );
                    },
                  },
                },
              ],
            },
          ]
        : [];

  const isRootSearchEmpty = search.trim() === '';
  const currentRecentRef = getCommandBarRecentRef(location.pathname, {
    accounts: allAccounts,
    dashboardPages,
    customReports,
  });
  const currentRecentKey = currentRecentRef
    ? commandBarRecentRefKey(currentRecentRef)
    : null;
  const recentItems = recentRefs
    .filter(ref => commandBarRecentRefKey(ref) !== currentRecentKey)
    .filter(ref => !favoriteKeys.has(commandBarRecentRefKey(ref)))
    .flatMap((ref): ResolvedRecentItem[] => {
      const key = commandBarRecentRefKey(ref);
      if (ref.type === 'navigation') {
        const item = navigationItems.find(item => item.id === ref.id);
        return item
          ? [
              {
                ref,
                key,
                path: item.path,
                name: item.name,
                Icon: item.Icon,
              },
            ]
          : [];
      }

      if (ref.type === 'account') {
        if (ref.id === 'onbudget' || ref.id === 'offbudget') {
          return [
            {
              ref,
              key,
              path: commandBarRecentPath(ref),
              name: ref.id === 'onbudget' ? t('On Budget') : t('Off Budget'),
              Icon: SvgLibrary,
            },
          ];
        }

        const account = allAccounts.find(
          item => item.id === ref.id && item.tombstone !== 1,
        );
        return account
          ? [
              {
                ref,
                key,
                path: commandBarRecentPath(ref),
                name: account.name,
                Icon: SvgLibrary,
              },
            ]
          : [];
      }

      if (ref.type === 'dashboard') {
        const dashboardPage = dashboardPages.find(
          item => item.id === ref.id && item.tombstone !== true,
        );
        return dashboardPage
          ? [
              {
                ref,
                key,
                path: commandBarRecentPath(ref),
                name: dashboardPage.name,
                Icon: SvgReports,
              },
            ]
          : [];
      }

      const report = customReports.find(
        item => item.id === ref.id && item.tombstone !== true,
      );
      return report
        ? [
            {
              ref,
              key,
              path: commandBarRecentPath(ref),
              name: report.name,
              Icon: SvgNotesPaperText,
            },
          ]
        : [];
    })
    .slice(0, 3);
  const recentItemKeys = new Set(recentItems.map(item => item.key));
  const isRootItemVisible = (key: string) =>
    !isRootSearchEmpty || (!favoriteKeys.has(key) && !recentItemKeys.has(key));
  const sections: SearchSection[] = [
    {
      key: 'accounts',
      heading: t('Accounts'),
      items: [
        ...(isRootItemVisible('account:onbudget')
          ? [
              {
                id: 'onbudget',
                name: t('On Budget'),
                content: (
                  <BalanceRow<'account', 'onbudget-accounts-balance'>
                    label={t('On Budget')}
                    binding={onBudgetAccountBalance()}
                    query={search}
                  />
                ),
                Icon: SvgLibrary,
              },
            ]
          : []),
        ...(isRootItemVisible('account:offbudget')
          ? [
              {
                id: 'offbudget',
                name: t('Off Budget'),
                content: (
                  <BalanceRow<'account', 'offbudget-accounts-balance'>
                    label={t('Off Budget')}
                    binding={offBudgetAccountBalance()}
                    query={search}
                  />
                ),
                Icon: SvgLibrary,
              },
            ]
          : []),
        ...accounts
          .filter(account => isRootItemVisible(`account:${account.id}`))
          .map(account => ({
            ...account,
            content: (
              <BalanceRow<'account', 'balance'>
                label={account.name}
                binding={accountBalance(account.id)}
                query={search}
              />
            ),
            leading: (
              <AccountStatusIndicator
                status={getAccountSyncStatus(account)}
                size={20}
              />
            ),
          })),
      ],
      onSelect: ({ id }) => handleNavigate(`/accounts/${id}`),
    },
    {
      key: 'accounts-closed',
      heading: t('Closed Accounts'),
      items: closedAccounts
        .filter(account => isRootItemVisible(`account:${account.id}`))
        .map(account => ({
          ...account,
          Icon: SvgLibrary,
        })),
      onSelect: ({ id }) => handleNavigate(`/accounts/${id}`),
    },
    {
      key: 'navigation',
      heading: t('Navigation'),
      items: navigationItems.filter(item =>
        isRootItemVisible(`navigation:${item.id}`),
      ),
      onSelect: ({ id }) => {
        const item = navigationItems.find(item => item.id === id);
        if (item) handleNavigate(item.path);
      },
    },
    {
      key: 'actions',
      heading: t('Quick actions'),
      items: quickActions.filter(action =>
        isRootItemVisible(`quick-action:${action.id}`),
      ),
      onSelect: ({ id }) => {
        const action = quickActions.find(action => action.id === id);
        if (!action) return;
        if (!action.keepOpen) dispatch(closeCommandBar());
        void (async () => {
          try {
            await action.run();
          } catch (error) {
            console.error('Command bar action failed', {
              commandId: action.id,
              error,
            });
          }
        })();
      },
    },
    {
      key: 'reports',
      heading: t('Reports'),
      items: dashboardPages
        .filter(dashboardPage =>
          isRootItemVisible(`dashboard:${dashboardPage.id}`),
        )
        .map(dashboardPage => ({
          ...dashboardPage,
          Icon: SvgReports,
        })),
      onSelect: ({ id }) => handleNavigate(`/reports/${id}`),
    },
    {
      key: 'reports-custom',
      heading: t('Custom Reports'),
      items: customReports
        .filter(report => isRootItemVisible(`report:${report.id}`))
        .map(report => ({
          ...report,
          Icon: SvgNotesPaperText,
        })),
      onSelect: ({ id }) => handleNavigate(`/reports/custom/${id}`),
    },
  ];

  const pageActionSection: SearchSection | null =
    contributedCommands.length > 0
      ? {
          key: 'page-actions',
          heading: t('Page actions'),
          items: contributedCommands
            .filter(
              command =>
                !isRootSearchEmpty ||
                !favoriteKeys.has(
                  favoriteRefKey({
                    type: 'page-action',
                    ownerId: command.ownerId ?? '',
                    commandId: command.commandId ?? command.id,
                    ...(command.instanceId != null
                      ? { instanceId: command.instanceId }
                      : {}),
                  }),
                ),
            )
            .map(command => ({
              id: command.id,
              name: command.label,
              destructive: command.destructive,
            })),
          onSelect: ({ id }) => {
            const command = contributedCommands.find(
              command => command.id === id,
            );
            if (!command) return;

            dispatch(closeCommandBar());
            void (async () => {
              try {
                await command.execute();
              } catch (error) {
                console.error('Command bar action failed', {
                  commandId: command.id,
                  error,
                });
              }
            })();
          },
        }
      : null;

  const favoriteItems = favoriteRefs.flatMap(ref => {
    let name: string | undefined;
    let Icon: ComponentType<SVGProps<SVGSVGElement>> | undefined;
    if (ref.type === 'account') {
      name =
        ref.id === 'onbudget'
          ? t('On Budget')
          : ref.id === 'offbudget'
            ? t('Off Budget')
            : allAccounts.find(item => item.id === ref.id)?.name;
      Icon = SvgLibrary;
    } else if (ref.type === 'report') {
      name = customReports.find(item => item.id === ref.id)?.name;
      Icon = SvgNotesPaperText;
    } else if (ref.type === 'navigation') {
      const item = navigationItems.find(item => item.id === ref.id);
      name = item?.name;
      Icon = item?.Icon;
    } else if (ref.type === 'dashboard') {
      name = dashboardPages.find(item => item.id === ref.id)?.name;
      Icon = SvgReports;
    } else if (ref.type === 'quick-action') {
      const item = quickActions.find(item => item.id === ref.id);
      name = item?.name;
      Icon = item?.Icon;
    } else {
      const command = contributedCommands.find(
        command =>
          (command.ownerId ?? '') === ref.ownerId &&
          (command.commandId ?? command.id) === ref.commandId &&
          command.instanceId === ref.instanceId,
      );
      name = command?.label;
    }
    const destructive =
      ref.type === 'page-action'
        ? contributedCommands.find(
            command =>
              (command.ownerId ?? '') === ref.ownerId &&
              (command.commandId ?? command.id) === ref.commandId &&
              command.instanceId === ref.instanceId,
          )?.destructive
        : false;
    return name ? [{ id: favoriteRefKey(ref), name, Icon, destructive }] : [];
  });
  const recentSection: SearchSection | null =
    isRootSearchEmpty && recentItems.length > 0
      ? {
          key: 'recent',
          heading: t('Recent'),
          items: recentItems.map(item => ({
            id: item.key,
            name: item.name,
            Icon: item.Icon,
          })),
          onSelect: ({ id }) => {
            const recentItem = recentItems.find(item => item.key === id);
            if (recentItem) runRootRef(recentItem.ref);
          },
        }
      : null;
  const favoriteSection: SearchSection | null =
    isRootSearchEmpty && favoriteItems.length > 0
      ? {
          key: 'favorites',
          heading: t('Favorites'),
          items: favoriteItems,
          onSelect: ({ id }) => {
            const ref = favoriteRefs.find(ref => favoriteRefKey(ref) === id);
            if (!ref) return;
            runRootRef(ref);
          },
        }
      : null;

  // Every root row has one canonical descriptor. The section is only a visual
  // grouping; it is never part of the persisted identity.
  const rootRefForValue = (value: string): CommandBarFavoriteRef | null => {
    const [section, ...parts] = value.split(':');
    const id = parts.join(':');
    if (section === 'favorites') {
      return favoriteRefs.find(ref => favoriteRefKey(ref) === id) ?? null;
    }
    if (section === 'recent') {
      return recentItems.find(item => item.key === id)?.ref ?? null;
    }
    if (section === 'navigation') return { type: 'navigation', id };
    if (section === 'accounts') return { type: 'account', id };
    if (section === 'accounts-closed') return { type: 'account', id };
    if (section === 'reports') return { type: 'dashboard', id };
    if (section === 'reports-custom') return { type: 'report', id };
    if (section === 'actions') return { type: 'quick-action', id };
    if (section === 'page-actions') {
      const command = contributedCommands.find(command => command.id === id);
      return command
        ? {
            type: 'page-action',
            ownerId: command.ownerId ?? '',
            commandId: command.commandId ?? command.id,
            ...(command.instanceId != null
              ? { instanceId: command.instanceId }
              : {}),
          }
        : null;
    }
    return null;
  };

  function runRootRef(ref: CommandBarFavoriteRef) {
    if (ref.type === 'navigation') {
      const item = navigationItems.find(item => item.id === ref.id);
      if (item) handleNavigate(item.path);
    } else if (ref.type === 'account') {
      handleNavigate(`/accounts/${ref.id}`);
    } else if (ref.type === 'dashboard') {
      handleNavigate(`/reports/${ref.id}`);
    } else if (ref.type === 'report') {
      handleNavigate(`/reports/custom/${ref.id}`);
    } else if (ref.type === 'quick-action') {
      const action = quickActions.find(action => action.id === ref.id);
      if (action) {
        if (!action.keepOpen) dispatch(closeCommandBar());
        runSafely(ref.id, action.run);
      }
    } else {
      const command = contributedCommands.find(
        command =>
          (command.ownerId ?? '') === ref.ownerId &&
          (command.commandId ?? command.id) === ref.commandId &&
          command.instanceId === ref.instanceId,
      );
      if (command) {
        dispatch(closeCommandBar());
        runSafely(command.id, command.execute);
      }
    }
  }

  function runSafely(commandId: string, run: () => void | Promise<void>) {
    void Promise.resolve()
      .then(run)
      .catch(error => {
        console.error('Command bar action failed', { commandId, error });
      });
  }

  const openActionForRef = useCallback(
    (ref: CommandBarFavoriteRef, rootValue: string) => {
      setRootSearch(search);
      setRootSelectedValue(rootValue);
      setActionPageRef(ref);
      const contextual = getContextualItem(
        ref.type === 'account' || ref.type === 'report'
          ? `favorites:${favoriteRefKey(ref)}`
          : rootValue,
      );
      setContextualItem(contextual);
      setPage(
        contextual?.type === 'account'
          ? 'account-actions'
          : contextual?.type === 'report'
            ? 'report-actions'
            : 'actions',
      );
      setSearch('');
      setSelectedValue('action:primary:open');
      setAnimatePageChange(true);
    },
    [getContextualItem, search],
  );

  const selectedRootRef =
    page === 'root' ? rootRefForValue(selectedValue) : null;
  const openSelectedContextualPage = useCallback(() => {
    if (page !== 'root' || selectedRootRef == null) return;
    openActionForRef(selectedRootRef, selectedValue);
  }, [openActionForRef, page, selectedRootRef, selectedValue]);

  const genericActionSections: readonly ActionSection[] =
    actionPageRef == null || contextualItem != null
      ? []
      : (() => {
          const ref = actionPageRef;
          let name = '';
          let Icon: ComponentType<SVGProps<SVGSVGElement>> | undefined;
          let run: (() => void | Promise<void>) | undefined;
          let destructive = false;
          if (ref.type === 'navigation') {
            const item = navigationItems.find(item => item.id === ref.id);
            name = item?.name ?? '';
            Icon = item?.Icon;
            run = item ? () => handleNavigate(item.path) : undefined;
          } else if (ref.type === 'account') {
            const aggregate = ref.id === 'onbudget' || ref.id === 'offbudget';
            const item = aggregate
              ? null
              : allAccounts.find(item => item.id === ref.id);
            name = aggregate
              ? ref.id === 'onbudget'
                ? t('On Budget')
                : t('Off Budget')
              : (item?.name ?? '');
            Icon = SvgLibrary;
            run = () => handleNavigate(`/accounts/${ref.id}`);
          } else if (ref.type === 'dashboard') {
            const item = dashboardPages.find(item => item.id === ref.id);
            name = item?.name ?? '';
            Icon = SvgReports;
            run = item ? () => handleNavigate(`/reports/${ref.id}`) : undefined;
          } else if (ref.type === 'report') {
            const item = customReports.find(item => item.id === ref.id);
            name = item?.name ?? '';
            Icon = SvgNotesPaperText;
            run = item
              ? () => handleNavigate(`/reports/custom/${ref.id}`)
              : undefined;
          } else if (ref.type === 'quick-action') {
            const item = quickActions.find(item => item.id === ref.id);
            name = item?.name ?? '';
            Icon = item?.Icon;
            run = item
              ? () => {
                  if (ref.id === 'change-theme') {
                    setPage('themes');
                    setSearch('');
                    setSelectedValue(`theme-builtin:${currentTheme}`);
                    setAnimatePageChange(true);
                    return;
                  }
                  if (!item.keepOpen) dispatch(closeCommandBar());
                  return item.run();
                }
              : undefined;
          } else {
            const command = contributedCommands.find(
              command =>
                (command.ownerId ?? '') === ref.ownerId &&
                (command.commandId ?? command.id) === ref.commandId &&
                command.instanceId === ref.instanceId,
            );
            name = command?.label ?? '';
            run = command
              ? () => {
                  dispatch(closeCommandBar());
                  return command.execute();
                }
              : undefined;
            destructive = command?.destructive ?? false;
          }
          if (!run || !name) return [];
          return [
            {
              key: 'primary',
              heading: t('Primary'),
              items: [
                {
                  id: 'open',
                  name,
                  Icon,
                  destructive,
                  keepOpen:
                    ref.type === 'quick-action' &&
                    quickActions.find(item => item.id === ref.id)?.keepOpen,
                  primaryAction: { label: name, run },
                },
              ],
            },
          ];
        })();

  const currentActionSections =
    contextualItem != null ? contextualActionSections : genericActionSections;
  const actionPageHeader: ActionPageHeader | null =
    contextualHeader ??
    (actionPageRef && genericActionSections.length
      ? {
          name: genericActionSections[0].items[0].name,
          typeLabel: getRootSectionLabel(actionPageRef),
          Icon: genericActionSections[0].items[0].Icon,
        }
      : null);
  const actionFavoriteSections: readonly ActionSection[] =
    actionPageRef == null || actionPageHeader == null
      ? currentActionSections
      : [
          {
            key: 'favorite',
            heading: t('Favorite'),
            items: [
              {
                id: 'favorite',
                name: favoriteKeys.has(favoriteRefKey(actionPageRef))
                  ? t('Remove from favorites')
                  : t('Add to favorites'),
                Icon: favoriteKeys.has(favoriteRefKey(actionPageRef))
                  ? SvgRemoveAlternate
                  : SvgBookmarkOutlineAdd,
                primaryAction: {
                  label: t('Favorite'),
                  run: () => toggleFavorite(actionPageRef),
                },
              },
            ],
          },
          ...currentActionSections,
        ];

  useEffect(() => {
    if (
      open &&
      page === 'actions' &&
      actionPageRef != null &&
      genericActionSections.length === 0
    ) {
      goBackToRoot();
    }
  }, [actionPageRef, genericActionSections.length, goBackToRoot, open, page]);

  const searchLower = search.toLowerCase();
  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item =>
      item.name.toLowerCase().includes(searchLower),
    ),
  }));
  const filteredPageActionSection =
    pageActionSection == null
      ? null
      : {
          ...pageActionSection,
          items: pageActionSection.items.filter(item =>
            item.name.toLowerCase().includes(searchLower),
          ),
        };
  const hasResults =
    filteredSections.some(section => !!section.items.length) ||
    (filteredPageActionSection?.items.length ?? 0) > 0;
  const hasRootResults =
    hasResults || recentSection != null || favoriteSection != null;
  const isActionPage =
    page === 'account-actions' ||
    page === 'report-actions' ||
    page === 'actions';
  const macPlatform = isMacPlatform();
  const selectedContextualAction = contextualActionSections
    .flatMap(section =>
      section.items.map(action => ({
        action,
        value: `action:${section.key}:${action.id}`,
      })),
    )
    .find(item => item.value === selectedValue)?.action;
  const secondaryShortcutHint =
    selectedContextualAction?.secondaryAction != null &&
    !selectedContextualAction.destructive
      ? {
          keys: ['Ctrl', '↵'],
          label: selectedContextualAction.secondaryAction.label,
        }
      : undefined;
  const commandListClassName = cx(
    css({
      flex: '1 1 auto',
      minHeight: 0,
      overflowY: 'auto',
      overscrollBehavior: 'contain',
      padding: 6,
      // Hide the scrollbar
      scrollbarWidth: 'none',
      '&::-webkit-scrollbar': {
        display: 'none',
      },
      // Ensure content is still scrollable
      msOverflowStyle: 'none',
    }),
    // Only a page *transition* animates in — not the dialog's initial
    // open (which remounts this same list with key="root" once).
    animatePageChange && pageEnterClassName,
  );

  return (
    <Command.Dialog
      loop
      vimBindings
      open={open}
      value={selectedValue}
      onValueChange={setSelectedValue}
      onOpenChange={value => dispatch(setCommandBarOpen(value))}
      label={t('Command Bar')}
      aria-label={t('Command Bar')}
      shouldFilter={false}
      onKeyDownCapture={event => {
        if (event.key !== 'Enter') return;

        const isLiteralCtrlEnter =
          event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
        const isModifiedEnter =
          event.ctrlKey || event.metaKey || event.altKey || event.shiftKey;

        if (page === 'root' && isModifiedEnter) {
          event.preventDefault();
          event.stopPropagation();
          if (isLiteralCtrlEnter) openSelectedContextualPage();
          return;
        }

        if (isActionPage && isModifiedEnter) {
          event.preventDefault();
          event.stopPropagation();
          if (
            isLiteralCtrlEnter &&
            selectedContextualAction != null &&
            !selectedContextualAction.destructive
          ) {
            runContextualAction(selectedContextualAction, 'secondary');
          }
        }
      }}
      overlayClassName={css({
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        backgroundColor: 'rgba(1, 4, 9, 0.45)',
        backdropFilter: 'blur(2px)',
        '@media (prefers-reduced-motion: no-preference)': {
          animation: `${overlayEnter} 0.14s ease`,
        },
      })}
      className={css({
        position: 'fixed',
        top: '14vh',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        width: 'min(600px, calc(100vw - 48px))',
        maxHeight: 'min(440px, 68vh)',
        backgroundColor: 'var(--color-modalBackground)',
        border: '1px solid var(--color-modalBorder)',
        color: 'var(--color-pageText)',
        borderRadius: 14,
        boxShadow:
          '0 0 0 1px rgba(0, 0, 0, 0.08), 0 24px 64px rgba(0, 0, 0, 0.35)',
        overflow: 'hidden',
        zIndex: 3001,
        '@media (prefers-reduced-motion: no-preference)': {
          animation: `${dialogEnter} 0.16s cubic-bezier(0.2, 0.9, 0.3, 1)`,
        },
      })}
    >
      {(page === 'root' || page === 'themes') && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            flexWrap: 'nowrap',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            gap: 10,
            flexShrink: 0,
            padding: '13px 15px',
            borderBottom: '1px solid var(--color-tableBorder)',
          }}
        >
          {page === 'themes' ? (
            <Button
              variant="bare"
              aria-label={t('Back')}
              onPress={goBackToRoot}
              style={{ flexShrink: 0, padding: 4 }}
            >
              <SvgArrowLeft style={{ width: 14, height: 14 }} />
            </Button>
          ) : (
            <SvgSearchAlternate
              width={15}
              height={15}
              style={{ flexShrink: 0, color: 'var(--color-pageTextSubdued)' }}
            />
          )}
          <Command.Input
            autoFocus
            placeholder={
              page === 'themes'
                ? t('Search themes...')
                : t('Search {{budgetName}}...', { budgetName })
            }
            value={search}
            onValueChange={setSearch}
            onKeyDown={e => {
              if (e.key === 'Backspace' && search === '' && page === 'themes') {
                e.preventDefault();
                goBackToRoot();
              }
            }}
            className={css({
              flex: '1 1 auto',
              minWidth: 0,
              padding: 0,
              fontSize: 16,
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--color-pageText)',
              outline: 'none',
              '&::placeholder': {
                color: 'var(--color-pageTextSubdued)',
              },
            })}
          />
          <KeyChip>esc</KeyChip>
        </View>
      )}
      {isActionPage ? (
        actionPageHeader != null && (
          <ActionPage
            key={page}
            header={actionPageHeader}
            sections={actionFavoriteSections}
            query={search}
            selectedValue={selectedValue}
            isMacPlatform={macPlatform}
            listClassName={commandListClassName}
            onQueryChange={query => {
              setSearch(query);
              const queryLower = query.trim().toLowerCase();
              const firstVisibleAction = actionFavoriteSections
                .flatMap(section => section.items)
                .find(action => action.name.toLowerCase().includes(queryLower));
              setSelectedValue(
                firstVisibleAction
                  ? `action:${
                      actionFavoriteSections.find(section =>
                        section.items.includes(firstVisibleAction),
                      )?.key
                    }:${firstVisibleAction.id}`
                  : '',
              );
            }}
            onSelectAction={runContextualAction}
            onBack={goBackToRoot}
            primaryShortcutHint={{ keys: ['↵'], label: t('Open') }}
            secondaryShortcutHint={secondaryShortcutHint}
            backShortcutHint={{ keys: ['esc'], label: t('back') }}
          />
        )
      ) : (
        <Command.List
          key={page}
          className={commandListClassName}
          label={
            page === 'themes' ? t('Available themes') : t('Available commands')
          }
        >
          {page === 'themes' ? (
            <ThemePage
              search={search}
              activeBuiltinTheme={currentTheme}
              activeCustomThemeId={activeCustomThemeId}
              onSelectBuiltin={applyBuiltinTheme}
              onSelectCatalog={applyCatalogTheme}
            />
          ) : (
            <>
              {recentSection != null && (
                <Command.Group
                  heading={recentSection.heading}
                  className={paletteGroupClassName}
                >
                  {recentSection.items.map(
                    ({ id, name, Icon, content, leading }) => (
                      <Command.Item
                        key={id}
                        onSelect={() => recentSection.onSelect({ id })}
                        value={`recent:${id}`}
                        aria-label={name}
                        className={paletteItemClassName}
                      >
                        {leading ?? (Icon && <Icon width={15} height={15} />)}
                        {content || (
                          <Text
                            style={{
                              flex: 1,
                              minWidth: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Highlight text={name} query={search} />
                          </Text>
                        )}
                      </Command.Item>
                    ),
                  )}
                </Command.Group>
              )}
              {filteredPageActionSection != null &&
                filteredPageActionSection.items.length > 0 && (
                  <Command.Group
                    heading={filteredPageActionSection.heading}
                    className={paletteGroupClassName}
                  >
                    {filteredPageActionSection.items.map(
                      ({ id, name, Icon, content, leading, destructive }) => (
                        <Command.Item
                          key={id}
                          onSelect={() =>
                            filteredPageActionSection.onSelect({ id })
                          }
                          value={`page-actions:${id}`}
                          aria-label={name}
                          className={
                            destructive
                              ? `${actionItemClassName} ${destructiveActionClassName}`
                              : paletteItemClassName
                          }
                        >
                          {leading ?? (Icon && <Icon width={15} height={15} />)}
                          {content || (
                            <Text
                              style={{
                                flex: 1,
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              <Highlight text={name} query={search} />
                            </Text>
                          )}
                        </Command.Item>
                      ),
                    )}
                  </Command.Group>
                )}
              {favoriteSection != null && (
                <Command.Group
                  heading={favoriteSection.heading}
                  className={paletteGroupClassName}
                >
                  {favoriteSection.items.map(
                    ({ id, name, Icon, content, leading, destructive }) => (
                      <Command.Item
                        key={id}
                        onSelect={() => favoriteSection.onSelect({ id })}
                        value={`favorites:${id}`}
                        aria-label={name}
                        className={
                          destructive
                            ? `${actionItemClassName} ${destructiveActionClassName}`
                            : paletteItemClassName
                        }
                      >
                        {leading ?? (Icon && <Icon width={15} height={15} />)}
                        {content || (
                          <Text
                            style={{
                              flex: 1,
                              minWidth: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Highlight text={name} query={search} />
                          </Text>
                        )}
                      </Command.Item>
                    ),
                  )}
                </Command.Group>
              )}
              {filteredSections.map(
                section =>
                  !!section.items.length && (
                    <Command.Group
                      key={section.key}
                      heading={section.heading}
                      className={paletteGroupClassName}
                    >
                      {section.items.map(
                        ({ id, name, Icon, content, leading }) => (
                          <Command.Item
                            key={id}
                            onSelect={() => section.onSelect({ id })}
                            value={`${section.key}:${id}`}
                            aria-label={name}
                            className={paletteItemClassName}
                          >
                            {leading ??
                              (Icon && <Icon width={15} height={15} />)}
                            {content || (
                              <Text
                                style={{
                                  flex: 1,
                                  minWidth: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                <Highlight text={name} query={search} />
                              </Text>
                            )}
                          </Command.Item>
                        ),
                      )}
                    </Command.Group>
                  ),
              )}

              {!hasRootResults && (
                <Command.Empty
                  className={css({
                    padding: '28px 0 32px',
                    textAlign: 'center',
                    fontSize: 13,
                    color: 'var(--color-pageTextSubdued)',
                  })}
                >
                  <Trans>No results found</Trans>
                </Command.Empty>
              )}
            </>
          )}
        </Command.List>
      )}
      {!isActionPage && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            flexShrink: 0,
            minWidth: 0,
            boxSizing: 'border-box',
            flexWrap: 'nowrap',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            lineHeight: '16px',
            padding: '9px 15px',
            borderTop: '1px solid var(--color-tableBorder)',
            backgroundColor: 'var(--color-pillBackgroundLight)',
          }}
        >
          <FooterHint keys={['↑', '↓']}>{t('navigate')}</FooterHint>
          <FooterHint keys={['↵']}>{t('select')}</FooterHint>
          {page === 'root' && selectedRootRef != null && (
            <ShortcutHint
              keys={['Ctrl', '↵']}
              label={<Trans>Open actions</Trans>}
            />
          )}
          <FooterHint keys={['esc']}>
            {page === 'root' ? t('close') : t('back')}
          </FooterHint>
        </View>
      )}
    </Command.Dialog>
  );
}
