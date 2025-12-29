import { useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgPencil1 } from '@actual-app/components/icons/v2';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/fetch';
import { type DashboardEntity } from 'loot-core/types/models';

type DashboardHeaderProps = {
  dashboard: DashboardEntity;
};

export function DashboardHeader({ dashboard }: DashboardHeaderProps) {
  const { t } = useTranslation();
  const [editingName, setEditingName] = useState(false);

  const handleSaveName = async (newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName === dashboard.name) {
      setEditingName(false);
      return;
    }
    await send('dashboard-rename', {
      id: dashboard.id,
      name: trimmedName,
    });
    setEditingName(false);
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        whiteSpace: 'nowrap',
        marginLeft: 20,
        gap: 3,
        '& .hover-visible': {
          opacity: 0,
          transition: 'opacity .25s',
        },
        '&:hover .hover-visible': {
          opacity: 1,
        },
      }}
    >
      {editingName ? (
        <InitialFocus>
          <Input
            defaultValue={dashboard.name}
            onEnter={handleSaveName}
            onUpdate={handleSaveName}
            onEscape={() => setEditingName(false)}
            style={{
              fontSize: 25,
              fontWeight: 500,
              marginTop: -3,
              marginBottom: -4,
              marginLeft: -6,
              paddingTop: 2,
              paddingBottom: 2,
              width: Math.max(20, dashboard.name.length) + 'ch',
            }}
          />
        </InitialFocus>
      ) : (
        <>
          <View style={{ fontSize: 25, fontWeight: 500 }}>
            <Trans>Reports</Trans>:
          </View>
          <View
            style={{
              fontSize: 25,
              fontWeight: 500,
              marginRight: 5,
            }}
          >
            {dashboard.name}
          </View>
          <Button
            variant="bare"
            aria-label={t('Rename dashboard')}
            className="hover-visible"
            onPress={() => setEditingName(true)}
          >
            <SvgPencil1
              style={{
                width: 11,
                height: 11,
                color: theme.pageTextSubdued,
              }}
            />
          </Button>
        </>
      )}
    </View>
  );
}
