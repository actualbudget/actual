import { useCallback, useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgAdd,
  SvgArrowLeft,
  SvgCog,
  SvgKeyboard,
  SvgLibrary,
  SvgReports,
  SvgStoreFront,
  SvgSwap,
  SvgTag,
  SvgTuning,
  SvgWallet,
} from '@actual-app/components/icons/v1';
import {
  SvgArrowsSynchronize,
  SvgCalendar3,
  SvgDownloadThickBottom,
  SvgHelp,
  SvgMoonStars,
  SvgNotesPaperText,
  SvgSearchAlternate,
  SvgViewHide,
  SvgViewShow,
} from '@actual-app/components/icons/v2';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';
import type { Theme } from '@actual-app/core/types/prefs';
import { css, cx } from '@emotion/css';
import { Command } from 'cmdk';
import { format } from 'date-fns';

import { useSyncAndDownloadMutation } from '#accounts';
import { useAccountSyncStatus } from '#accounts/useAccountSyncStatus';
import { closeBudget } from '#budgetfiles/budgetfilesSlice';
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
import { useMetadataPref } from '#hooks/useMetadataPref';
import { useModalState } from '#hooks/useModalState';
import { useNavigate } from '#hooks/useNavigate';
import { useReports } from '#hooks/useReports';
import { useSyncedPref } from '#hooks/useSyncedPref';
import { pushModal } from '#modals/modalsSlice';
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

import { BalanceRow, FooterHint, Highlight, KeyChip } from './primitives';
import {
  dialogEnter,
  overlayEnter,
  pageEnterClassName,
  paletteGroupClassName,
  paletteItemClassName,
} from './styles';
import { ThemePage } from './ThemePage';
import type { QuickAction, SearchSection } from './types';

export function CommandBar() {
  const { t } = useTranslation();
  const open = useSelector(state => state.commandBar.open);
  const [search, setSearch] = useState('');
  // 'themes' is a nested palette page (VS Code-style): the "Change theme…"
  // action transitions into it; esc / backspace-on-empty goes back.
  const [page, setPage] = useState<'root' | 'themes'>('root');
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const contributedCommands = useCommandBarCommands();
  const { mutate: syncAndDownload } = useSyncAndDownloadMutation();
  const { startTour } = useTour();
  const [budgetName] = useMetadataPref('budgetName');
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
    setSearch('');
    setAnimatePageChange(true);
  }, []);

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
      setAnimatePageChange(false);
    }
  }, [open]);

  const { data: allAccounts = [] } = useAccounts();
  const { data: customReports = [] } = useReports();
  const { data: dashboardPages = [] } = useDashboardPages();

  const accounts = allAccounts.filter(acc => !acc.closed);
  const getAccountSyncStatus = useAccountSyncStatus();

  const openEventListener = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        // Do not open CommandBar if a modal is already open
        if (modalStack.length > 0) return;
        dispatch(openCommandBar());
      }
    },
    [dispatch, modalStack.length],
  );

  useEffect(() => {
    document.addEventListener('keydown', openEventListener);
    return () => document.removeEventListener('keydown', openEventListener);
  }, [openEventListener]);

  useEffect(() => {
    if (!open || page !== 'themes') return;

    function handleThemePageEscape(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      goBackToRoot();
    }

    window.addEventListener('keydown', handleThemePageEscape, true);
    return () =>
      window.removeEventListener('keydown', handleThemePageEscape, true);
  }, [goBackToRoot, open, page]);

  const handleNavigate = useCallback(
    (path: string) => {
      dispatch(closeCommandBar());
      void navigate(path);
    },
    [dispatch, navigate],
  );

  // Built-in quick actions. Each one is wired to an existing app flow that
  // works from any page. Contributed commands are appended below and kept
  // separate from these static actions.
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
        setPage('themes');
        setSearch('');
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
  const quickActions: QuickAction[] = [
    ...builtinQuickActions,
    ...contributedCommands.map(command => ({
      id: command.id,
      name: command.label,
      run: command.execute,
    })),
  ];

  const sections: SearchSection[] = [
    {
      key: 'accounts',
      heading: t('Accounts'),
      items: [
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
        ...accounts.map(account => ({
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
      key: 'navigation',
      heading: t('Navigation'),
      items: navigationItems,
      onSelect: ({ id }) => {
        const item = navigationItems.find(item => item.id === id);
        if (item) handleNavigate(item.path);
      },
    },
    {
      key: 'actions',
      heading: t('Quick actions'),
      items: quickActions,
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
      items: dashboardPages.map(dashboardPage => ({
        ...dashboardPage,
        Icon: SvgReports,
      })),
      onSelect: ({ id }) => handleNavigate(`/reports/${id}`),
    },
    {
      key: 'reports-custom',
      heading: t('Custom Reports'),
      items: customReports.map(report => ({
        ...report,
        Icon: SvgNotesPaperText,
      })),
      onSelect: ({ id }) => handleNavigate(`/reports/custom/${id}`),
    },
  ];

  const searchLower = search.toLowerCase();
  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item =>
      item.name.toLowerCase().includes(searchLower),
    ),
  }));
  const hasResults = filteredSections.some(section => !!section.items.length);

  return (
    <Command.Dialog
      vimBindings
      open={open}
      onOpenChange={value => dispatch(setCommandBarOpen(value))}
      label={t('Command Bar')}
      aria-label={t('Command Bar')}
      shouldFilter={false}
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
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
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
      <Command.List
        key={page}
        className={cx(
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
          // open, which remounts this same list with key="root" once.
          animatePageChange && pageEnterClassName,
        )}
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
                ),
            )}

            {!hasResults && (
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
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          flexShrink: 0,
          padding: '9px 15px',
          borderTop: '1px solid var(--color-tableBorder)',
          backgroundColor: 'var(--color-pillBackgroundLight)',
        }}
      >
        <FooterHint keys={['↑', '↓']}>{t('navigate')}</FooterHint>
        <FooterHint keys={['↵']}>{t('select')}</FooterHint>
        <FooterHint keys={['esc']}>{t('close')}</FooterHint>
      </View>
    </Command.Dialog>
  );
}
