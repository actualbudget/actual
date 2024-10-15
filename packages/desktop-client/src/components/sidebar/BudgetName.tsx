import React, { type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import { closeBudget } from 'loot-core/src/client/actions';
import * as Platform from 'loot-core/src/client/platform';

import { useMetadataPref } from '../../hooks/useMetadataPref';
import { useNavigate } from '../../hooks/useNavigate';
import { SvgLogo } from '../../icons/logo';
import { SvgPencil1 } from '../../icons/v2';
import { theme } from '../../style';
import { Button } from '../common/Button2';
import { InitialFocus } from '../common/InitialFocus';
import { Input } from '../common/Input';
import { Menu } from '../common/Menu';
import { Popover } from '../common/Popover';
import { Text } from '../common/Text';
import { View } from '../common/View';

type BudgetNameProps = {
  children?: ReactNode;
};

export function BudgetName({ children }: BudgetNameProps) {
  const hasWindowButtons = !Platform.isBrowser && Platform.OS === 'mac';

  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function onMenuSelect(type: string) {
    setMenuOpen(false);

    switch (type) {
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
    { name: 'settings', text: t('Settings') },
    { name: 'close', text: t('Close file') },
  ];

  return (
    <View
      style={{
        padding: '15px 8px',
        flexDirection: 'row',
        alignItems: 'center',
        userSelect: 'none',
        transition: 'padding .4s',
        ...(hasWindowButtons && {
          paddingTop: 0,
          justifyContent: 'flex-start',
        }),
        '& .hover-visible': {
          opacity: 0,
          transition: 'opacity .25s',
        },
        '&:hover .hover-visible': {
          opacity: 1,
        },
      }}
    >
      <Button
        ref={triggerRef}
        variant="bare"
        style={{
          margin: 5,
          flex: '0 auto',
        }}
        onPress={() => setMenuOpen(true)}
      >
        <SvgLogo
          width={20}
          height={20}
          style={{
            color: theme.sidebarItemTextSelected,
          }}
        />
      </Button>

      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={menuOpen}
        onOpenChange={() => setMenuOpen(false)}
      >
        <Menu onMenuSelect={onMenuSelect} items={items} />
      </Popover>

      <EditableBudgetName />

      <View style={{ flex: 1, flexDirection: 'row' }} />

      {children}
    </View>
  );
}

function EditableBudgetName() {
  const { t } = useTranslation();
  const [budgetName, setBudgetNamePref] = useMetadataPref('budgetName');
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <InitialFocus>
        <Input
          style={{
            maxWidth: 'calc(100% - 73px)',
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
    <>
      <Text
        style={{
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          fontSize: 16,
          fontWeight: 500,
        }}
      >
        {budgetName || t('A budget has no name')}
      </Text>

      <Button
        variant="bare"
        aria-label={t('Edit budget name')}
        className="hover-visible"
        onPress={() => setEditing(true)}
        style={{ margin: 5 }}
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
  );
}
