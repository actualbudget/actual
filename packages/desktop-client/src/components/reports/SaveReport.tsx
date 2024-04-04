import React, { createRef, useState } from 'react';

import { useReports } from 'loot-core/client/data-hooks/reports';
import { send, sendCatch } from 'loot-core/src/platform/client/fetch';
import { type CustomReportEntity } from 'loot-core/src/types/models';

import { SvgExpandArrow } from '../../icons/v0';
import { Button } from '../common/Button';
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
  const listReports = useReports();
  const [deleteMenuOpen, setDeleteMenuOpen] = useState(false);
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chooseMenuOpen, setChooseMenuOpen] = useState(false);
  const [menuItem, setMenuItem] = useState('');
  const [err, setErr] = useState('');
  const [name, setName] = useState(report.name ?? '');
  const inputRef = createRef<HTMLInputElement>();

  async function onApply(cond: string) {
    const chooseSavedReport = listReports.find(r => cond === r.id);
    onReportChange({ savedReport: chooseSavedReport, type: 'choose' });
    setChooseMenuOpen(false);
    setName(chooseSavedReport === undefined ? '' : chooseSavedReport.name);
  }

  const onAddUpdate = async ({ menuChoice }: { menuChoice?: string }) => {
    if (!menuChoice) {
      return null;
    }
    if (menuChoice === 'save-report') {
      const newSavedReport = {
        ...report,
        ...customReportItems,
        name,
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

    const updatedReport = {
      ...report,
      ...(menuChoice === 'rename-report' ? { name } : customReportItems),
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
    setName('');
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
        setName('');
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
      {menuOpen && (
        <SaveReportMenu
          onClose={() => setMenuOpen(false)}
          onMenuSelect={onMenuSelect}
          savedStatus={savedStatus}
          listReports={listReports && listReports.length}
        />
      )}
      {nameMenuOpen && (
        <SaveReportName
          onClose={() => setNameMenuOpen(false)}
          menuItem={menuItem}
          name={name}
          setName={setName}
          inputRef={inputRef}
          onAddUpdate={onAddUpdate}
          err={err}
        />
      )}
      {chooseMenuOpen && (
        <SaveReportChoose
          onApply={onApply}
          onClose={() => setChooseMenuOpen(false)}
        />
      )}
      {deleteMenuOpen && (
        <SaveReportDelete
          onDelete={onDelete}
          onClose={() => setDeleteMenuOpen(false)}
          name={report.name}
        />
      )}
    </View>
  );
}
