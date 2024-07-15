import { DndProvider } from 'react-dnd';
import { View } from '../common/View';
import { SidebarProvider } from '../sidebar/SidebarProvider';
import { ScrollProvider } from '../ScrollProvider';
import { HTML5Backend as Backend } from 'react-dnd-html5-backend';
import { useEffect, useMemo, useState } from 'react';
import { useActions } from '../../hooks/useActions';
import { checkForUpdateNotification } from 'loot-core/client/update-notification';
import { getIsOutdated, getLatestVersion } from '../../util/versions';
import { ExposeNavigate } from '../../util/router-tools';
import { GlobalKeys } from '../GlobalKeys';
import { ThemeStyle, hasHiddenScrollbars, theme } from '../../style';
import { FloatableSidebar } from '../sidebar';
import { Titlebar } from '../Titlebar';
import { Notifications } from '../Notifications';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ReactElement } from 'react-markdown/lib/react-markdown';
import { ResponsiveProvider, useResponsive } from '../../ResponsiveProvider';
import { useNavigate } from '../../hooks/useNavigate';
import { AdminWideComponent, WideComponent } from '../responsive';
import { Modals } from '../Modals';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { AppBackground } from '../AppBackground';
import { FatalError } from '../FatalError';
import { DevelopmentTopBar } from '../DevelopmentTopBar';
import * as Platform from 'loot-core/src/client/platform';
import { AdminFloatableSidebar } from './AdminFloatableSidebar';
import { AdminTitlebar } from './AdminTitlebar';
import { useDispatch } from 'react-redux';

function NarrowNotSupported({
  redirectTo = '/budget',
  children,
}: {
  redirectTo?: string;
  children: ReactElement;
}) {
  const { isNarrowWidth } = useResponsive();
  const navigate = useNavigate();
  useEffect(() => {
    if (isNarrowWidth) {
      navigate(redirectTo);
    }
  }, [isNarrowWidth, navigate, redirectTo]);
  return isNarrowWidth ? null : children;
}

function AdminAppWithoutContext() {
  const actions = useActions();
  useEffect(() => {
    // Wait a little bit to make sure the sync button will get the
    // sync start event. This can be improved later.
    setTimeout(async () => {
      await actions.sync();

      await checkForUpdateNotification(
        actions.addNotification,
        getIsOutdated,
        getLatestVersion,
        actions.loadPrefs,
        actions.savePrefs,
      );
    }, 100);
  }, []);

  return (
    <View style={{ height: '100%' }}>
      {/* <AuthProvider>
         <BrowserRouter> */}
      <ExposeNavigate />

      <View style={{ height: '100%' }}>
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: theme.pageBackground,
            flex: 1,
          }}
        >
          <AdminFloatableSidebar />

          <View
            style={{
              color: theme.pageText,
              backgroundColor: theme.pageBackground,
              flex: 1,
              overflow: 'hidden',
              width: '100%',
            }}
          >
            <div
              style={{
                flex: 1,
                display: 'flex',
                overflow: 'auto',
                position: 'relative',
              }}
            >
              <AdminTitlebar
                style={{
                  WebkitAppRegion: 'drag',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 1000,
                }}
              />
              <Notifications />

              <Routes>
                <Route
                  path="/users"
                  element={
                    <NarrowNotSupported>
                      <AdminWideComponent name="Users" />
                    </NarrowNotSupported>
                  }
                />
                <Route
                  path="/"
                  element={
                    <NarrowNotSupported>
                      <AdminWideComponent name="AdminIndex" />
                    </NarrowNotSupported>
                  }
                />
              </Routes>
              <Modals />
            </div>
          </View>
        </View>
      </View>
      {/* </BrowserRouter>
       </AuthProvider> */}
    </View>
  );
}

function ErrorFallback({ error }: FallbackProps) {
  return (
    <>
      <AppBackground />
      <FatalError error={error} />
    </>
  );
}

export function Admin() {
  const app = useMemo(() => <AdminAppWithoutContext />, []);

  return (
    <SidebarProvider>
      <DndProvider backend={Backend}>
        <ScrollProvider>{app}</ScrollProvider>
      </DndProvider>
    </SidebarProvider>
  );
}
