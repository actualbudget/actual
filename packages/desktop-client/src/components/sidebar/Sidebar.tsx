import React, { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';

import { SvgAdd } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import * as Platform from '@actual-app/core/shared/platform';
import { css } from '@emotion/css';
import { Resizable } from 're-resizable';
import type { ResizeCallback } from 're-resizable';

import { FeatureErrorFallback } from '#components/FeatureErrorFallback';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { useLocalPref } from '#hooks/useLocalPref';
import { replaceModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { Accounts } from './Accounts';
import { BudgetName } from './BudgetName';
import { NavTiles } from './NavTiles';
import { SecondaryButtons } from './SecondaryButtons';
import { useSidebar } from './SidebarProvider';
import { SummaryWidget } from './SummaryWidget';
import { ToggleButton } from './ToggleButton';
import { WIDTH_MODE_ORDER, WIDTH_MODE_PIXELS } from './widthMode';
import type { WidthMode } from './widthMode';
import { WidthToggleButton } from './WidthToggleButton';

function closestWidthMode(width: number): WidthMode {
  return WIDTH_MODE_ORDER.reduce<WidthMode>(
    (closest, mode) =>
      Math.abs(WIDTH_MODE_PIXELS[mode] - width) <
      Math.abs(WIDTH_MODE_PIXELS[closest] - width)
        ? mode
        : closest,
    WIDTH_MODE_ORDER[0],
  );
}

export function Sidebar() {
  const hasWindowButtons = !Platform.isBrowser && Platform.OS === 'mac';

  const { t } = useTranslation();
  const dispatch = useDispatch();
  const sidebar = useSidebar();
  const [isFloating = false, setFloatingSidebarPref] =
    useGlobalPref('floatingSidebar');

  const [widthModePref, setWidthModePref] = useLocalPref('sidebar.widthMode');
  const widthMode: WidthMode = widthModePref ?? 'full';

  // Live width during a drag; snaps back to the pref's width once the drag
  // (or a footer/keyboard width change) settles on a mode.
  const [liveWidth, setLiveWidth] = useState(WIDTH_MODE_PIXELS[widthMode]);

  useEffect(() => {
    setLiveWidth(WIDTH_MODE_PIXELS[widthMode]);
  }, [widthMode]);

  const onResize: ResizeCallback = (_e, _direction, ref) => {
    setLiveWidth(ref.offsetWidth);
  };

  const onResizeStop: ResizeCallback = (_e, _direction, ref) => {
    const snapped = closestWidthMode(ref.offsetWidth);
    setWidthModePref(snapped);
    setLiveWidth(WIDTH_MODE_PIXELS[snapped]);
  };

  const onFloat = () => {
    setFloatingSidebarPref(!isFloating);
  };

  const onAddAccount = () => {
    dispatch(replaceModal({ modal: { name: 'add-account', options: {} } }));
  };

  return (
    <ErrorBoundary FallbackComponent={FeatureErrorFallback}>
      <Resizable
        size={{ width: liveWidth, height: '100%' }}
        onResize={onResize}
        onResizeStop={onResizeStop}
        maxWidth={WIDTH_MODE_PIXELS.full}
        minWidth={WIDTH_MODE_PIXELS.rail}
        enable={{
          top: false,
          right: true,
          bottom: false,
          left: false,
          topRight: false,
          bottomRight: false,
          bottomLeft: false,
          topLeft: false,
        }}
      >
        <View
          className={css({
            color: theme.sidebarItemText,
            height: '100%',
            backgroundColor: theme.sidebarBackground,
            '& .float': {
              opacity: isFloating ? 1 : 0,
              transition: 'opacity .25s, width .25s',
              width: hasWindowButtons || isFloating ? null : 0,
            } as CSSProperties,
            '&:hover .float': {
              opacity: 1,
              width: hasWindowButtons ? null : 'auto',
            } as CSSProperties,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            ...styles.darkScrollbar,
          })}
        >
          {widthMode !== 'rail' && (
            <BudgetName>
              {!sidebar.alwaysFloats && (
                <ToggleButton isFloating={isFloating} onFloat={onFloat} />
              )}
            </BudgetName>
          )}

          <View
            style={{
              flexGrow: 1,
              minHeight: 0,
              paddingTop: widthMode === 'rail' ? 12 : 0,
              gap: widthMode === 'rail' ? 4 : 0,
              '@media screen and (max-height: 480px)': {
                overflowY: 'auto',
              },
            }}
          >
            <SummaryWidget size={widthMode} />
            <NavTiles widthMode={widthMode} />

            {widthMode !== 'rail' && <Accounts />}
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: widthMode === 'rail' ? 'center' : undefined,
              flexShrink: 0,
              paddingRight: widthMode === 'rail' ? 0 : 8,
            }}
          >
            {widthMode !== 'rail' && (
              <View style={{ flex: 1, minWidth: 0 }}>
                <SecondaryButtons
                  buttons={[
                    {
                      title: t('Add account'),
                      Icon: SvgAdd,
                      onClick: onAddAccount,
                    },
                  ]}
                />
              </View>
            )}
            <WidthToggleButton
              widthMode={widthMode}
              onChange={setWidthModePref}
            />
          </View>
        </View>
      </Resizable>
    </ErrorBoundary>
  );
}
