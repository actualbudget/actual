import React, { type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgExpandArrow } from '@actual-app/components/icons/v0';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import * as Platform from 'loot-core/shared/platform';

import { closeBudget } from '@desktop-client/budgets/budgetsSlice';
import { useContextMenu } from '@desktop-client/hooks/useContextMenu';
import { useMetadataPref } from '@desktop-client/hooks/useMetadataPref';
import { useNavigate } from '@desktop-client/hooks/useNavigate';
import { useDispatch } from '@desktop-client/redux';

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState(false);
  const { setMenuOpen, menuOpen, handleContextMenu, resetPosition, position } =
    useContextMenu();

  function onMenuSelect(type: string) {
    setMenuOpen(false);

    switch (type) {
      case 'rename':
        setEditing(true);
        break;
      case 'settings':
        navigate('/settings');
        break;
      case 'close':
        dispatch(closeBudget());
        break;
      default:
    }
  }

  const items = [
    { name: 'rename', text: t('Rename budget') },
    { name: 'settings', text: t('Settings') },
    { name: 'close', text: t('Switch file') },
  ];

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
    <View onContextMenu={handleContextMenu}>
      <Button
        ref={triggerRef}
        variant="bare"
        style={{
          color: theme.buttonNormalBorder,
          fontSize: 16,
          fontWeight: 500,
          marginLeft: -5,
          flex: '0 auto',
        }}
        onPress={() => {
          resetPosition();
          setMenuOpen(true);
        }}
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

      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={menuOpen}
        onOpenChange={() => setMenuOpen(false)}
        style={{ margin: 1 }}
        {...position}
      >
        <Menu onMenuSelect={onMenuSelect} items={items} />
      </Popover>
    </View>
  );
}
