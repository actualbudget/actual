import React, { type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { InitialFocus } from '@actual-app/components/initial-focus';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { closeBudget } from 'loot-core/client/actions';
import * as Platform from 'loot-core/client/platform';

import { useContextMenu } from '../../hooks/useContextMenu';
import { useMetadataPref } from '../../hooks/useMetadataPref';
import { useNavigate } from '../../hooks/useNavigate';
import { SvgExpandArrow } from '../../icons/v0';
import { useDispatch } from '../../redux';
import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Input } from '../common/Input';

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
        ...(hasWindowButtons && {
          paddingTop: 20,
          justifyContent: 'flex-start',
        }),
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
    { name: 'close', text: t('Close file') },
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
          onEnter={e => {
            const inputEl = e.target as HTMLInputElement;
            const newBudgetName = inputEl.value;
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
