// @ts-strict-ignore
import React, { createRef, useState } from 'react';

import { v4 as uuidv4 } from 'uuid';

import { send, sendCatch } from 'loot-core/src/platform/client/fetch';
import { type CustomReportEntity } from 'loot-core/src/types/models';

import { SvgExpandArrow } from '../../icons/v0';
import { Button } from '../common/Button';
import { Text } from '../common/Text';
import { View } from '../common/View';

import { SaveReportMenu } from './SaveReportMenu';
import { SaveReportName } from './SaveReportName';

type SaveReportProps<T extends CustomReportEntity = CustomReportEntity> = {
  customReportItems: T;
  report: CustomReportEntity;
  savedStatus: string;
  onReportChange: (savedReport: T, type: string) => void;
  onResetReports: () => void;
};

export function SaveReport({
  customReportItems,
  report,
  savedStatus,
  onReportChange,
  onResetReports,
}: SaveReportProps) {
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuItem, setMenuItem] = useState(null);
  const [err, setErr] = useState(null);
  const [name, setName] = useState(report.name);
  const inputRef = createRef<HTMLInputElement>();
  const id = report.id;

  const onAddUpdate = async () => {
    let savedReport: CustomReportEntity;
    let res;
    //save existing states
    savedReport = {
      ...report,
      ...customReportItems,
    };

    if (menuItem === 'save-report') {
      //create new flow
      /*
      res = await sendCatch('report/create', {
        ...savedReport,
      });
      */
      savedReport = {
        ...savedReport,
        id: uuidv4(),
        name,
      };
    }

    if (menuItem === 'rename-report') {
      //rename or update flow
      //rename
      savedReport = {
        ...report,
        name,
      };
    }

    if (menuItem === 'update-report') {
      savedReport = {
        ...savedReport,
        name: report.name,
      };
      //send update and rename to DB
      /*
      res = await sendCatch('report/update', {
        ...savedReport,
      });
      */
    }
    if (res) {
      setErr(res.error.message);
      setNameMenuOpen(true);
    } else {
      setNameMenuOpen(false);
      onReportChange(
        savedReport,
        menuItem === 'rename-report' ? 'rename' : 'add-update',
      );
    }
  };

  const onNameChange = cond => {
    setName(cond);
  };

  const onMenuSelect = async item => {
    setMenuItem(item);
    switch (item) {
      case 'rename-report':
        setErr(null);
        setMenuOpen(false);
        setNameMenuOpen(true);
        break;
      case 'delete-report':
        setMenuOpen(false);
        //await send('report/delete', id);
        onResetReports();
        break;
      case 'update-report':
        setErr(null);
        setMenuOpen(false);
        onAddUpdate();
        break;
      case 'save-report':
        setErr(null);
        setMenuOpen(false);
        setNameMenuOpen(true);
        break;
      case 'reload-report':
        setMenuOpen(false);
        onReportChange(null, 'reload');
        break;
      case 'reset-report':
        setMenuOpen(false);
        onResetReports();
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
          report={report}
          onMenuSelect={onMenuSelect}
          savedStatus={savedStatus}
        />
      )}
      {nameMenuOpen && (
        <SaveReportName
          onClose={() => setNameMenuOpen(false)}
          menuItem={menuItem}
          onNameChange={onNameChange}
          inputRef={inputRef}
          onAddUpdate={onAddUpdate}
          err={err}
        />
      )}
    </View>
  );
}
