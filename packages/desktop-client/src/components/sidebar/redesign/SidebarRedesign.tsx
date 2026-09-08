import { useTranslation } from 'react-i18next';

import { SvgAdd } from '@actual-app/components/icons/v1';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import { Accounts } from '#components/sidebar/Accounts';
import { SecondaryButtons } from '#components/sidebar/SecondaryButtons';
import { useSidebar } from '#components/sidebar/SidebarProvider';
import { SidebarShell } from '#components/sidebar/SidebarShell';
import { ToggleButton } from '#components/sidebar/ToggleButton';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { replaceModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

import { PrimaryNav } from './PrimaryNav';
import { SidebarFooter } from './SidebarFooter';
import { SidebarHeader } from './SidebarHeader';

const DEFAULT_SIDEBAR_WIDTH = 270;

export function SidebarRedesign() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const sidebar = useSidebar();
  const [isFloating = false, setFloatingSidebarPref] =
    useGlobalPref('floatingSidebar');

  const onFloat = () => {
    setFloatingSidebarPref(!isFloating);
  };

  const onAddAccount = () => {
    dispatch(replaceModal({ modal: { name: 'add-account', options: {} } }));
  };

  return (
    <SidebarShell
      defaultWidth={DEFAULT_SIDEBAR_WIDTH}
      className="sidebar-redesign"
    >
      <View
        role="navigation"
        aria-label={t('Sidebar')}
        style={{ flex: 1, minHeight: 0 }}
      >
        <SidebarHeader>
          {!sidebar.alwaysFloats && (
            <ToggleButton isFloating={isFloating} onFloat={onFloat} />
          )}
        </SidebarHeader>

        <PrimaryNav />

        <View
          style={{
            height: 1,
            margin: `${spacing.sm}px ${spacing.md}px`,
            backgroundColor: theme.sidebarBorder,
            flexShrink: 0,
          }}
        />

        <View style={{ flexGrow: 1, overflowY: 'auto' }}>
          <Accounts />

          <SecondaryButtons
            buttons={[
              {
                title: t('Add account'),
                Icon: SvgAdd,
                onClick: onAddAccount,
                dataTestId: 'sidebar-add-account',
              },
            ]}
          />
        </View>

        <SidebarFooter />
      </View>
    </SidebarShell>
  );
}
