import { useRef, useState } from 'react';
import { Dialog, DialogTrigger } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgExpandArrow } from '@actual-app/components/icons/v0';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/connection';
import type { DashboardEntity } from 'loot-core/types/models';

import { useNavigate } from '@desktop-client/hooks/useNavigate';

type DashboardSelectorProps = {
  dashboards: readonly DashboardEntity[];
  currentDashboard: DashboardEntity;
};

export function DashboardSelector({
  dashboards,
  currentDashboard,
}: DashboardSelectorProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const triggerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleAddDashboard = async () => {
    const defaultName = t('New dashboard');
    const newId = await send('dashboard-create', { name: defaultName });
    if (newId) {
      navigate(`/reports/${newId}`);
    }
  };

  return (
    <DialogTrigger>
      <Button
        ref={triggerRef}
        onPress={() => setMenuOpen(true)}
        style={{
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: 'auto',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
        }}
      >
        <View
          style={{
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: 'auto',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
            textAlign: 'center',
          }}
        >
          {currentDashboard.name}
        </View>
        <SvgExpandArrow
          width={7}
          height={7}
          style={{
            flexGrow: 0,
            flexShrink: 0,
            flexBasis: 'auto',
            marginLeft: 5,
          }}
        />
      </Button>

      {menuOpen && (
        <Popover
          triggerRef={triggerRef}
          isOpen
          onOpenChange={setMenuOpen}
          placement="bottom start"
        >
          <Dialog>
            <Menu
              slot="close"
              onMenuSelect={item => {
                if (item === 'add-new') {
                  handleAddDashboard();
                } else {
                  navigate(`/reports/${item}`);
                }
                setMenuOpen(false);
              }}
              items={[
                ...dashboards.map(dashboard => ({
                  name: dashboard.id,
                  text: dashboard.name,
                })),
                Menu.line,
                {
                  name: 'add-new',
                  text: t('Add new dashboard'),
                },
              ]}
            />
          </Dialog>
        </Popover>
      )}
    </DialogTrigger>
  );
}
