import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgPencil1 } from '@actual-app/components/icons/v2';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import type { DashboardPageEntity } from 'loot-core/types/models';

import { useRenameDashboardPageMutation } from '@desktop-client/reports/mutations';

type DashboardHeaderProps = {
  dashboard: DashboardPageEntity;
};

export function DashboardHeader({ dashboard }: DashboardHeaderProps) {
  const { t } = useTranslation();
  const [editingName, setEditingName] = useState(false);

  const renameDashboardPageMutation = useRenameDashboardPageMutation();

  const handleSaveName = async (newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName === dashboard.name) {
      setEditingName(false);
      return;
    }

    renameDashboardPageMutation.mutate(
      { id: dashboard.id, name: trimmedName },
      {
        onSuccess: () => {
          setEditingName(false);
        },
      },
    );
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
        flexGrow: 1,
        flexShrink: 1,
        flexBasis: 'auto',
        minWidth: 0,
        display: 'flex',
        justifyContent: 'flex-start',
      }}
    >
      <View
        style={{
          fontSize: 25,
          fontWeight: 500,
          flexGrow: 0,
          flexShrink: 0,
          flexBasis: 'auto',
        }}
      >
        <Trans>Reports</Trans>:
      </View>
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
              paddingTop: 2,
              paddingBottom: 2,
            }}
          />
        </InitialFocus>
      ) : (
        <>
          <View
            style={{
              fontSize: 25,
              fontWeight: 500,
              marginRight: 5,
              flexGrow: 0,
              flexShrink: 1,
              flexBasis: 'auto',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
            }}
          >
            {dashboard.name}
          </View>
          <Button
            variant="bare"
            aria-label={t('Rename dashboard')}
            className="hover-visible"
            style={{
              marginRight: 5,
            }}
            onPress={() => setEditingName(true)}
          >
            <SvgPencil1
              style={{
                width: 11,
                height: 11,
                flexGrow: 0,
                flexShrink: 0,
                flexBasis: 'auto',
                color: theme.pageTextSubdued,
              }}
            />
          </Button>
        </>
      )}
    </View>
  );
}
