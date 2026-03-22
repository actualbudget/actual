// @ts-strict-ignore
import React, { memo, useEffect, useState } from 'react';
import type { ComponentProps, CSSProperties } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import {
  SvgAlertTriangle,
  SvgViewHide,
  SvgViewShow,
} from '@actual-app/components/icons/v2';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';

import { listen } from 'loot-core/platform/client/connection';
import { isDevelopmentEnvironment } from 'loot-core/shared/environment';

import { MonthPicker } from './MonthPicker';
import { getScrollbarWidth } from './util';

import { sync } from '@desktop-client/app/appSlice';
import { AnimatedRefresh } from '@desktop-client/components/AnimatedRefresh';
import { MonthCountSelector } from '@desktop-client/components/budget/MonthCountSelector';
import { Link } from '@desktop-client/components/common/Link';
import { HelpMenu } from '@desktop-client/components/HelpMenu';
import { LoggedInUser } from '@desktop-client/components/LoggedInUser';
import { useServerURL } from '@desktop-client/components/ServerContext';
import { ThemeSelector } from '@desktop-client/components/ThemeSelector';
import { useGlobalPref } from '@desktop-client/hooks/useGlobalPref';
import { useIsTestEnv } from '@desktop-client/hooks/useIsTestEnv';
import { useMetadataPref } from '@desktop-client/hooks/useMetadataPref';
import { useSheetValue } from '@desktop-client/hooks/useSheetValue';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';
import { useDispatch } from '@desktop-client/redux';
import * as bindings from '@desktop-client/spreadsheet/bindings';
type BudgetPageHeaderProps = {
  startMonth: string;
  onMonthSelect: (month: string) => void;
  numMonths: number;
  monthBounds: ComponentProps<typeof MonthPicker>['monthBounds'];
};

function BudgetTitlebar() {
  const [maxMonths, setMaxMonthsPref] = useGlobalPref('maxMonths');

  return (
    <View style={{ flexDirection: 'row' }}>
      <MonthCountSelector
        maxMonths={maxMonths || 1}
        onChange={value => setMaxMonthsPref(value)}
      />
    </View>
  );
}
function UncategorizedButton() {
  const count: number | null = useSheetValue(bindings.uncategorizedCount());
  if (count === null || count <= 0) {
    return null;
  }

  return (
    <Link
      variant="button"
      buttonVariant="bare"
      to="/categories/uncategorized"
      style={{
        color: theme.errorText,
      }}
    >
      <Trans count={count}>{{ count }} uncategorized transactions</Trans>
    </Link>
  );
}

type PrivacyButtonProps = {
  style?: CSSProperties;
};

function PrivacyButton({ style }: PrivacyButtonProps) {
  const { t } = useTranslation();
  const [isPrivacyEnabledPref, setPrivacyEnabledPref] =
    useSyncedPref('isPrivacyEnabled');
  const isPrivacyEnabled = String(isPrivacyEnabledPref) === 'true';

  const privacyIconStyle = { width: 15, height: 15 };

  useHotkeys(
    'shift+ctrl+p, shift+cmd+p, shift+meta+p',
    () => {
      setPrivacyEnabledPref(String(!isPrivacyEnabled));
    },
    {
      preventDefault: true,
      scopes: ['app'],
    },
    [setPrivacyEnabledPref, isPrivacyEnabled],
  );

  return (
    <Button
      variant="bare"
      aria-label={
        isPrivacyEnabled ? t('Disable privacy mode') : t('Enable privacy mode')
      }
      onPress={() => setPrivacyEnabledPref(String(!isPrivacyEnabled))}
      style={style}
    >
      {isPrivacyEnabled ? (
        <SvgViewHide style={privacyIconStyle} />
      ) : (
        <SvgViewShow style={privacyIconStyle} />
      )}
    </Button>
  );
}

type ServerSyncButtonProps = {
  style?: CSSProperties;
  isMobile?: boolean;
};
function ServerSyncButton({ style, isMobile = false }: ServerSyncButtonProps) {
  const { t } = useTranslation();
  const [cloudFileId] = useMetadataPref('cloudFileId');
  const dispatch = useDispatch();
  const [syncing, setSyncing] = useState(false);
  const [syncState, setSyncState] = useState<
    null | 'offline' | 'local' | 'disabled' | 'error'
  >(null);

  useEffect(() => {
    const unlisten = listen('sync-event', event => {
      if (event.type === 'start') {
        setSyncing(true);
        setSyncState(null);
      } else {
        // Give the layout some time to apply the starting animation
        // so we always finish it correctly even if it's almost
        // instant
        setTimeout(() => {
          setSyncing(false);
        }, 200);
      }

      if (event.type === 'error') {
        // Use the offline state if either there is a network error or
        // if this file isn't a "cloud file". You can't sync a local
        // file.
        if (event.subtype === 'network') {
          setSyncState('offline');
        } else if (!cloudFileId) {
          setSyncState('local');
        } else {
          setSyncState('error');
        }
      } else if (event.type === 'success') {
        setSyncState(event.syncDisabled ? 'disabled' : null);
      }
    });

    return unlisten;
  }, [cloudFileId]);

  const mobileColor =
    syncState === 'error'
      ? theme.errorText
      : syncState === 'disabled' ||
          syncState === 'offline' ||
          syncState === 'local'
        ? theme.mobileHeaderTextSubdued
        : theme.mobileHeaderText;
  const desktopColor =
    syncState === 'error'
      ? theme.errorTextDark
      : syncState === 'disabled' ||
          syncState === 'offline' ||
          syncState === 'local'
        ? theme.buttonBareDisabledText
        : 'inherit';

  const activeStyle = isMobile
    ? {
        color: mobileColor,
      }
    : {};

  const hoveredStyle = isMobile
    ? {
        color: mobileColor,
        background: theme.mobileHeaderTextHover,
      }
    : {};

  const mobileIconStyle = {
    color: mobileColor,
    justifyContent: 'center',
    margin: 10,
    paddingLeft: 5,
    paddingRight: 3,
  };

  const mobileTextStyle = {
    ...styles.text,
    fontWeight: 500,
    marginLeft: 2,
    marginRight: 5,
  };

  const onSync = () => dispatch(sync());

  useHotkeys(
    'ctrl+s, cmd+s, meta+s',
    onSync,
    {
      enableOnFormTags: true,
      preventDefault: true,
      scopes: ['app'],
    },
    [onSync],
  );

  return (
    <Button
      variant="bare"
      aria-label={t('Server Sync')}
      className={css({
        ...(isMobile
          ? {
              ...style,
              WebkitAppRegion: 'none',
              ...mobileIconStyle,
            }
          : {
              ...style,
              WebkitAppRegion: 'none',
              color: desktopColor,
            }),
        '&[data-hovered]': hoveredStyle,
        '&[data-pressed]': activeStyle,
      })}
      onPress={onSync}
      isDisabled={syncState === 'offline'}
      aria-disabled={syncState === 'offline'}
    >
      {isMobile ? (
        syncState === 'error' ? (
          <SvgAlertTriangle width={14} height={14} />
        ) : (
          <AnimatedRefresh width={18} height={18} animating={syncing} />
        )
      ) : syncState === 'error' ? (
        <SvgAlertTriangle width={13} />
      ) : (
        <AnimatedRefresh animating={syncing} />
      )}
      <Text style={isMobile ? { ...mobileTextStyle } : { marginLeft: 3 }}>
        {syncState === 'disabled' ? t('Disabled') : null}
      </Text>
    </Button>
  );
}

export const BudgetPageHeader = memo<BudgetPageHeaderProps>(
  ({ startMonth, onMonthSelect, numMonths, monthBounds }) => {
    const [categoryExpandedStatePref] = useGlobalPref('categoryExpandedState');
    const categoryExpandedState = categoryExpandedStatePref ?? 0;
    const offsetMultipleMonths = numMonths === 1 ? 4 : 0;
    const isTestEnv = useIsTestEnv();
    const serverURL = useServerURL();

    return (
      <View
        style={{
          backgroundColor: 'hotpink',
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'end',
          height: 40, // cause of the absolute positioning of the year in monthpicker. Refactor
          // marginLeft:
          //   200 + 100 * categoryExpandedStte + 5 - offsetMultipleMonths,
          // flexShrink: 0,
        }}
      >
        <BudgetTitlebar />
        <View
          style={{
            width: '60%',
            // marginRight: 5 + getScrollbarWidth() - offsetMultipleMonths,
          }}
        >
          <MonthPicker
            startMonth={startMonth}
            numDisplayed={numMonths}
            monthBounds={monthBounds}
            style={{ paddingTop: 5 }}
            onSelect={month => onMonthSelect(month)}
          />
        </View>

        <View style={{ display: 'flex', flexDirection: 'row' }}>
          <UncategorizedButton />
          {isDevelopmentEnvironment() && !isTestEnv && <ThemeSelector />}
          <PrivacyButton />
          {serverURL ? <ServerSyncButton /> : null}
          <LoggedInUser />
          <HelpMenu />
        </View>
      </View>
    );
  },
);

BudgetPageHeader.displayName = 'BudgetPageHeader';
