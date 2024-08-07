import React, { createRef, useRef, useState } from 'react';

import { useReports } from 'loot-core/client/data-hooks/reports';
import { send, sendCatch } from 'loot-core/src/platform/client/fetch';
import { type CustomReportEntity } from 'loot-core/src/types/models';

import { SvgExpandArrow } from '../../icons/v0';
import { Button } from '../common/Button';
import { Popover } from '../common/Popover';
import { Text } from '../common/Text';
import { View } from '../common/View';

import { SaveReportChoose } from './SaveReportChoose';
import { SaveReportDelete } from './SaveReportDelete';
import { SaveReportMenu } from './SaveReportMenu';
import { SaveReportName } from './SaveReportName';

type SaveReportProps<T extends CustomReportEntity = CustomReportEntity> = {
  customReportItems: T;
  report: CustomReportEntity;
  savedStatus: string;
  onReportChange: ({
    savedReport,
    type,
  }: {
    savedReport?: T;
    type: string;
  }) => void;
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
        type="bare"
        onClick={() => {
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
          {!report.id ? 'Unsaved report' : report.name}&nbsp;
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
