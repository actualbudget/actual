import React, { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgExpandArrow } from '@actual-app/components/icons/v0';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { isElectron } from '@actual-app/core/shared/environment';
import * as Platform from '@actual-app/core/shared/platform';

import { closeBudget } from '#budgetfiles/budgetfilesSlice';
import { useContextMenu } from '#hooks/useContextMenu';
import { useMetadataPref } from '#hooks/useMetadataPref';
import { useNavigate } from '#hooks/useNavigate';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

type BudgetNameProps = {
  children?: ReactNode;
};

export function BudgetName({ children }: BudgetNameProps) {
  const hasWindowButtons = !Platform.isBrowser && Platform.OS === 'mac';

  return (
    <View
      style={{
        paddingTop: 35,
        height: 30,
        flexDirection: 'row',
        alignItems: 'center',
        margin: '0 8px 23px 20px',
        userSelect: 'none',
        transition: 'padding .4s',
        ...(hasWindowButtons
          ? {
              paddingTop: 20,
              justifyContent: 'flex-start',
            }
          : {}),
      }}
    >
      <EditableBudgetName />

      <View style={{ flex: 1, flexDirection: 'row' }} />

      {children}
    </View>
  );
}

function EditableBudgetName() {
  const { t } = useTranslation();
  const [budgetName, setBudgetNamePref] = useMetadataPref('budgetName');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { handleContextMenu } = useContextMenu({
    triggerRef,
    items: [
      {
        name: 'rename',
        text: t('Rename budget'),
        onClick: () => setEditing(true),
      },
      {
        name: 'settings',
        text: t('Settings'),
        onClick: () => void navigate('/settings'),
      },
      isElectron() && {
        name: 'loadBackup',
        text: t('Load Backup…'),
        onClick: () =>
          dispatch(pushModal({ modal: { name: 'load-backup', options: {} } })),
      },
      {
        name: 'close',
        text: t('Switch file'),
        onClick: () => void dispatch(closeBudget()),
      },
    ],
  });

  if (editing) {
    return (
      <InitialFocus>
        <Input
          style={{
            maxWidth: 'calc(100% - 23px)',
            fontSize: 16,
            fontWeight: 500,
          }}
          defaultValue={budgetName}
          onEnter={newBudgetName => {
            if (newBudgetName.trim() !== '') {
              setBudgetNamePref(newBudgetName);
              setEditing(false);
            }
          }}
          onBlur={() => setEditing(false)}
        />
      </InitialFocus>
    );
  }

  return (
    <Button
      ref={triggerRef}
      data-testid="budget-name"
      variant="bare"
      style={{
        color: theme.sidebarBudgetName,
        fontSize: 16,
        fontWeight: 500,
        marginLeft: -5,
        flex: '0 auto',
      }}
      onClick={handleContextMenu}
    >
      <Text style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
        {budgetName || t('Unnamed')}
      </Text>
      <SvgExpandArrow
        width={7}
        height={7}
        style={{ flexShrink: 0, marginLeft: 5 }}
      />
    </Button>
  );
}
