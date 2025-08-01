import React, { createRef, useRef, useState } from 'react';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgExpandArrow } from '@actual-app/components/icons/v0';
import { Popover } from '@actual-app/components/popover';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { send, sendCatch } from 'loot-core/platform/client/fetch';
import { type CustomReportEntity } from 'loot-core/types/models';

import { SaveReportChoose } from './SaveReportChoose';
import { SaveReportDelete } from './SaveReportDelete';
import { SaveReportMenu } from './SaveReportMenu';
import { SaveReportName } from './SaveReportName';

import { useReports } from '@desktop-client/hooks/useReports';

type SaveReportProps<T extends CustomReportEntity = CustomReportEntity> = {
  customReportItems: T;
  report: CustomReportEntity;
  savedStatus: string;
  onReportChange: (
    params:
      | {
          type: 'add-update';
          savedReport: CustomReportEntity;
        }
      | {
          type: 'rename';
          savedReport?: CustomReportEntity;
        }
      | {
          type: 'modify';
        }
      | {
          type: 'reload';
        }
      | {
          type: 'reset';
        }
      | {
          type: 'choose';
          savedReport?: CustomReportEntity;
        },
  ) => void;
};

export function SaveReport({
  customReportItems,
  report,
  savedStatus,
  onReportChange,
}: SaveReportProps) {
  const { data: listReports } = useReports();
  const triggerRef = useRef(null);
  const [deleteMenuOpen, setDeleteMenuOpen] = useState(false);
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chooseMenuOpen, setChooseMenuOpen] = useState(false);
  const [menuItem, setMenuItem] = useState('');
  const [err, setErr] = useState('');
  const [newName, setNewName] = useState(report.name ?? '');
  const inputRef = createRef<HTMLInputElement>();

  async function onApply(cond: string) {
    const chooseSavedReport = listReports.find(r => cond === r.id);
    onReportChange({ savedReport: chooseSavedReport, type: 'choose' });
    setChooseMenuOpen(false);
    setNewName(chooseSavedReport === undefined ? '' : chooseSavedReport.name);
  }

  const onAddUpdate = async ({ menuChoice }: { menuChoice?: string }) => {
    if (!menuChoice) {
      return null;
    }
    if (menuChoice === 'save-report') {
      const newSavedReport = {
        ...report,
        ...customReportItems,
        name: newName,
      };

      const response = await sendCatch('report/create', newSavedReport);

      if (response.error) {
        setErr(response.error.message);
        setNameMenuOpen(true);
        return;
      }

      // Add to dashboard
      await send('dashboard-add-widget', {
        type: 'custom-report',
        width: 4,
        height: 2,
        meta: { id: response.data },
      });

      setNameMenuOpen(false);
      onReportChange({
        savedReport: {
          ...newSavedReport,
          id: response.data,
        },
        type: 'add-update',
      });
      return;
    }

    const { name, id, ...props } = customReportItems;

    const updatedReport = {
      ...report,
      ...(menuChoice === 'rename-report' ? { name: newName } : props),
    };

    const response = await sendCatch('report/update', updatedReport);

    if (response.error) {
      setErr(response.error.message);
      setNameMenuOpen(true);
      return;
    }
    setNameMenuOpen(false);
    onReportChange({
      savedReport: updatedReport,
      type: menuChoice === 'rename-report' ? 'rename' : 'add-update',
    });
  };

  const onDelete = async () => {
    setNewName('');
    await send('report/delete', report.id);
    onReportChange({ type: 'reset' });
    setDeleteMenuOpen(false);
  };

  const onMenuSelect = async (item: string) => {
    setMenuItem(item);
    switch (item) {
      case 'rename-report':
        setErr('');
        setMenuOpen(false);
        setNameMenuOpen(true);
        break;
      case 'delete-report':
        setMenuOpen(false);
        setDeleteMenuOpen(true);
        break;
      case 'update-report':
        setErr('');
        setMenuOpen(false);
        onAddUpdate({ menuChoice: item });
        break;
      case 'save-report':
        setErr('');
        setMenuOpen(false);
        setNameMenuOpen(true);
        break;
      case 'reload-report':
        setMenuOpen(false);
        onReportChange({ type: 'reload' });
        break;
      case 'reset-report':
        setMenuOpen(false);
        setNewName('');
        onReportChange({ type: 'reset' });
        break;
      case 'choose-report':
        setErr('');
        setMenuOpen(false);
        setChooseMenuOpen(true);
        break;
      default:
    }
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
      }}
    >
      <Button
        ref={triggerRef}
        variant="bare"
        onPress={() => {
          setMenuOpen(true);
        }}
      >
        <Text
          style={{
            maxWidth: 150,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flexShrink: 0,
          }}
        >
          {!report.id ? <Trans>Unsaved report</Trans> : report.name}&nbsp;
        </Text>
        {savedStatus === 'modified' && <Text>(modified)&nbsp;</Text>}
        <SvgExpandArrow width={8} height={8} style={{ marginRight: 5 }} />
      </Button>

      <Popover
        triggerRef={triggerRef}
        isOpen={menuOpen}
        onOpenChange={() => setMenuOpen(false)}
        style={{ width: 150 }}
      >
        <SaveReportMenu
          onMenuSelect={onMenuSelect}
          savedStatus={savedStatus}
          listReports={listReports && listReports.length}
        />
      </Popover>

      <Popover
        triggerRef={triggerRef}
        isOpen={nameMenuOpen}
        onOpenChange={() => setNameMenuOpen(false)}
        style={{ width: 325 }}
      >
        <SaveReportName
          menuItem={menuItem}
          name={newName}
          setName={setNewName}
          inputRef={inputRef}
          onAddUpdate={onAddUpdate}
          err={err}
        />
      </Popover>

      <Popover
        triggerRef={triggerRef}
        isOpen={chooseMenuOpen}
        onOpenChange={() => setChooseMenuOpen(false)}
        style={{ padding: 15 }}
      >
        <SaveReportChoose onApply={onApply} />
      </Popover>

      <Popover
        triggerRef={triggerRef}
        isOpen={deleteMenuOpen}
        onOpenChange={() => setDeleteMenuOpen(false)}
        style={{ width: 275, padding: 15 }}
      >
        <SaveReportDelete
          onDelete={onDelete}
          onClose={() => setDeleteMenuOpen(false)}
          name={report.name}
        />
      </Popover>
    </View>
  );
}
