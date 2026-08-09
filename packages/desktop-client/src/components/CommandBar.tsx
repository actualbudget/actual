import type { ComponentType, ReactNode, SVGProps } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import {
  SvgCog,
  SvgLibrary,
  SvgPiggyBank,
  SvgReports,
  SvgStoreFront,
  SvgTag,
  SvgTuning,
  SvgWallet,
} from '@actual-app/components/icons/v1';
import {
  SvgCalendar3,
  SvgNotesPaperText,
} from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';
import { Command } from 'cmdk';

import { useAccounts } from '#hooks/useAccounts';
import { useDashboardPages } from '#hooks/useDashboardPages';
import { useMetadataPref } from '#hooks/useMetadataPref';
import { useModalState } from '#hooks/useModalState';
import { useNavigate } from '#hooks/useNavigate';
import { useReports } from '#hooks/useReports';
import type { Binding, SheetFields, SheetNames } from '#spreadsheet';
import {
  accountBalance,
  allAccountBalance,
  offBudgetAccountBalance,
  onBudgetAccountBalance,
} from '#spreadsheet/bindings';

import { CellValue, CellValueText } from './spreadsheet/CellValue';

type SearchableItem = {
  /** The name to display and use for searching */
  name: string;
  /**
   * The item content to display. If not provided, {@link SearchableItem.name `name`} will be used.
   *
   * Meant for complex items that want to display more than just static text.
   */
  content?: ReactNode;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  path: string;
};

type SearchSection = {
  key: string;
  heading: string;
  items: Readonly<SearchableItem[]>;
};

function BalanceRow<
  SheetName extends SheetNames,
  FieldName extends SheetFields<SheetName>,
>({
  label,
  binding,
}: {
  label: string;
  binding: Binding<SheetName, FieldName>;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flex: 1,
      }}
    >
      <Text>{label}</Text>
      <CellValue binding={binding} type="financial">
        {props => (
          <CellValueText
            {...props}
            style={{ ...styles.tnum, whiteSpace: 'nowrap', opacity: 0.9 }}
          />
        )}
      </CellValue>
    </View>
  );
}

export function CommandBar() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const [budgetName] = useMetadataPref('budgetName');
  const { modalStack } = useModalState();

  const navigationItems = useMemo(
    () => [
      { name: t('Budget'), path: '/budget', Icon: SvgWallet },
      {
        name: t('Reports'),
        path: '/reports',
        Icon: SvgReports,
      },
      {
        name: t('Schedules'),
        path: '/schedules',
        Icon: SvgCalendar3,
      },
      { name: t('Payees'), path: '/payees', Icon: SvgStoreFront },
      { name: t('Rules'), path: '/rules', Icon: SvgTuning },
      { name: t('Tags'), path: '/tags', Icon: SvgTag },
      { name: t('Settings'), path: '/settings', Icon: SvgCog },
      {
        name: t('All Accounts'),
        path: '/accounts',
        content: (
          <BalanceRow<'account', 'accounts-balance'>
            label={t('All Accounts')}
            binding={allAccountBalance()}
          />
        ),
        Icon: SvgLibrary,
      },
    ],
    [t],
  );

  useEffect(() => {
    // Reset search when closing
    if (!open) setSearch('');
  }, [open]);

  const { data: allAccounts } = useAccounts();
  const { data: customReports } = useReports();
  const { data: dashboardPages, isPending: isDashboardPagesPending } =
    useDashboardPages();

  const accounts = useMemo(
    () => (allAccounts ?? []).filter(acc => !acc.closed),
    [allAccounts],
  );

  const openEventListener = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        // Do not open CommandBar if a modal is already open
        if (modalStack.length > 0) return;
        setOpen(true);
      }
    },
    [modalStack.length],
  );

  useEffect(() => {
    document.addEventListener('keydown', openEventListener);
    return () => document.removeEventListener('keydown', openEventListener);
  }, [openEventListener]);

  function handleNavigate(path: string) {
    setOpen(false);
    void navigate(path);
  }

  const sections = useMemo<SearchSection[]>(
    () => [
      {
        key: 'navigation',
        heading: t('Navigation'),
        items: navigationItems,
      },
      {
        key: 'accounts',
        heading: t('Accounts'),
        items: [
          {
            name: t('On Budget'),
            path: '/accounts/onbudget',
            content: (
              <BalanceRow<'account', 'onbudget-accounts-balance'>
                label={t('On Budget')}
                binding={onBudgetAccountBalance()}
              />
            ),
            Icon: SvgLibrary,
          },
          {
            name: t('Off Budget'),
            path: '/accounts/offbudget',
            content: (
              <BalanceRow<'account', 'offbudget-accounts-balance'>
                label={t('Off Budget')}
                binding={offBudgetAccountBalance()}
              />
            ),
            Icon: SvgLibrary,
          },
          ...accounts.map(account => ({
            name: account.name,
            path: `/accounts/${account.id}`,
            content: (
              <BalanceRow<'account', 'balance'>
                label={account.name}
                binding={accountBalance(account.id)}
              />
            ),
            Icon: SvgPiggyBank,
          })),
        ],
      },
      {
        key: 'reports',
        heading: t('Reports'),
        items: (dashboardPages ?? []).map(dashboardPage => ({
          name: dashboardPage.name,
          path: `/reports/${dashboardPage.id}`,
          Icon: SvgReports,
        })),
      },
      {
        key: 'reports-custom',
        heading: t('Custom Reports'),
        items: (customReports ?? []).map(report => ({
          name: report.name,
          path: `/reports/custom/${report.id}`,
          Icon: SvgNotesPaperText,
        })),
      },
    ],
    [accounts, customReports, dashboardPages, navigationItems, t],
  );

  const eligibleItems = useMemo(
    () => sections.flatMap(section => section.items),
    [sections],
  );
  const [recentPaths, setRecentPaths] = useState<string[]>([]);

  // Watching the router here means visits from the sidebar, links, and other
  // screens are recorded too. Nothing is persisted, so a refresh starts fresh.
  useEffect(() => {
    // `/reports` is an alias which redirects to the first dashboard. Do not
    // leave the alias in Recent while that redirect is resolving.
    if (
      location.pathname === '/reports' &&
      (isDashboardPagesPending || (dashboardPages ?? []).length > 0)
    ) {
      return;
    }

    const currentItem = eligibleItems.find(
      item => item.path === location.pathname,
    );
    if (!currentItem) return;

    setRecentPaths(paths => {
      if (paths[0] === currentItem.path) return paths;
      return [
        currentItem.path,
        ...paths.filter(path => path !== currentItem.path),
      ];
    });
  }, [
    dashboardPages,
    eligibleItems,
    isDashboardPagesPending,
    location.pathname,
  ]);

  const recentSectionItems: SearchableItem[] = [];
  for (const path of recentPaths) {
    if (path === location.pathname) continue;

    const item = eligibleItems.find(item => item.path === path);
    if (!item) continue;

    recentSectionItems.push(item);
    if (recentSectionItems.length === 3) break;
  }

  const sectionsWithRecent: SearchSection[] =
    recentSectionItems.length > 0
      ? [
          {
            key: 'recent',
            heading: t('Recent'),
            items: recentSectionItems,
          },
          ...sections,
        ]
      : sections;

  const searchLower = search.toLowerCase();
  const filteredSections = sectionsWithRecent.map(section => ({
    ...section,
    items: section.items.filter(item =>
      item.name.toLowerCase().includes(searchLower),
    ),
  }));
  const hasResults = filteredSections.some(section => !!section.items.length);

  return (
    <Command.Dialog
      vimBindings
      loop
      open={open}
      onOpenChange={setOpen}
      label={t('Command Bar')}
      aria-label={t('Command Bar')}
      shouldFilter={false}
      className={css({
        position: 'fixed',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%, -30%)',
        width: '90%',
        maxWidth: '600px',
        backgroundColor: 'var(--color-modalBackground)',
        border: '1px solid var(--color-modalBorder)',
        color: 'var(--color-pageText)',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        zIndex: 3001,
      })}
    >
      <Command.Input
        autoFocus
        placeholder={t('Search {{budgetName}}...', { budgetName })}
        value={search}
        onValueChange={setSearch}
        className={css({
          width: '100%',
          padding: '12px 16px',
          fontSize: '1rem',
          border: 'none',
          borderBottom: '1px solid var(--color-tableBorderSeparator)',
          backgroundColor: 'transparent',
          color: 'var(--color-pageText)',
          outline: 'none',
          '&::placeholder': {
            color: 'var(--color-pageTextSubdued)',
          },
        })}
      />
      <Command.List
        className={css({
          maxHeight: '300px',
          overflowY: 'auto',
          padding: '8px 0',
          // Hide the scrollbar
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          // Ensure content is still scrollable
          msOverflowStyle: 'none',
        })}
      >
        {filteredSections.map(
          section =>
            !!section.items.length && (
              <Command.Group
                key={section.key}
                heading={section.heading}
                className={css({
                  padding: '0 8px',
                  '& [cmdk-group-heading]': {
                    padding: '8px 8px 4px',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: 'var(--color-pageTextSubdued)',
                    textTransform: 'uppercase',
                  },
                })}
              >
                {section.items.map(({ name, path, Icon, content }) => (
                  <Command.Item
                    key={path}
                    onSelect={() => handleNavigate(path)}
                    value={`${section.key}:${path}`}
                    className={css({
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      borderRadius: '4px',
                      margin: '0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      // Avoid showing mouse hover styles when using keyboard navigation
                      '[data-cmdk-list]:not([data-cmdk-list-nav-active]) &:hover':
                        {
                          backgroundColor:
                            'var(--color-menuItemBackgroundHover)',
                          color: 'var(--color-menuItemTextHover)',
                        },

                      "&[data-selected='true']": {
                        backgroundColor: 'var(--color-menuItemBackgroundHover)',
                        color: 'var(--color-menuItemTextHover)',
                      },
                    })}
                  >
                    <Icon width={16} height={16} />
                    {content || name}
                  </Command.Item>
                ))}
              </Command.Group>
            ),
        )}

        {!hasResults && (
          <Command.Empty
            className={css({
              padding: '16px',
              textAlign: 'center',
              fontSize: '0.9rem',
              color: 'var(--color-pageTextSubdued)',
            })}
          >
            <Trans>No results found</Trans>
          </Command.Empty>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
