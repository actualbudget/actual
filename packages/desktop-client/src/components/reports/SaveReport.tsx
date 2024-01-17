// @ts-strict-ignore
import React, { createRef, useState } from 'react';

import { send, sendCatch } from 'loot-core/src/platform/client/fetch';

import { SvgExpandArrow } from '../../icons/v0';
import { Button } from '../common/Button';
import { Text } from '../common/Text';
import { View } from '../common/View';

import { type DataEntity } from './entities';
import { SaveReportMenu } from './SaveReportMenu';
import { SaveReportName } from './SaveReportName';

type SaveReportProps = {
  reportId;
  startDate: string;
  endDate: string;
  mode: string;
  groupBy: string;
  balanceType: string;
  showEmpty: boolean;
  showOffBudgetHidden: boolean;
  showUncategorized: boolean;
  graphType: string;
  filters;
  conditionsOp: string;
  selectedCategories;
  onReportChange;
  onResetReports;
  data: DataEntity;
};

export function SaveReport({
  reportId,
  startDate,
  endDate,
  mode,
  groupBy,
  balanceType,
  showEmpty,
  showOffBudgetHidden,
  showUncategorized,
  graphType,
  filters,
  conditionsOp,
  selectedCategories,
  onReportChange,
  onResetReports,
  data,
}: SaveReportProps) {
  const [nameOpen, setNameOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuItem, setMenuItem] = useState(null);
  const [err, setErr] = useState(null);
  const [name, setName] = useState(reportId.name);
  const inputRef = createRef<HTMLInputElement>();
  const id = reportId.id;
  let savedReport;

  const onAddUpdate = async () => {
    let savedReport;
    let res;
    //save existing states
    savedReport = {
      ...reportId,
      mode,
      group_by: groupBy,
      balance_type: balanceType,
      show_empty: showEmpty ? 1 : 0,
      show_offbudgethidden: showOffBudgetHidden ? 1 : 0,
      show_uncategorized: showUncategorized ? 1 : 0,
      graph_type: graphType,
      selected_categories: selectedCategories,
      conditions: filters,
      conditions_op: conditionsOp,
      name,
      start_date: startDate,
      end_date: endDate,
      data,
      status: 'saved',
    };
    if (menuItem === 'save-report') {
      //create new flow
      const { status, ...sendSaved } = savedReport;
      res = await sendCatch('report-create', {
        state: sendSaved,
      });
      savedReport = {
        ...savedReport,
        id: res.data,
      };
    } else {
      //rename or update flow
      if (menuItem === 'rename-report') {
        //rename
        savedReport = {
          ...reportId,
          name,
        };
      }
      //send update and rename to DB
      const { status, ...sendSaved } = savedReport;
      res = await sendCatch('report-update', {
        state: sendSaved,
      });
    }
    if (res.error) {
      setErr(res.error.message);
      setNameOpen(true);
    } else {
      setNameOpen(false);
      onReportChange(savedReport, 'add-update');
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
        setNameOpen(true);
        break;
      case 'delete-report':
        setMenuOpen(false);
        await send('report-delete', id);
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
        setNameOpen(true);
        break;
      case 'reload-report':
        setMenuOpen(false);
        savedReport = {
          status: 'saved',
        };
        onReportChange(savedReport, 'reload');
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
          {!reportId.id ? 'Unsaved filter' : reportId.name}&nbsp;
        </Text>
        <SvgExpandArrow width={8} height={8} style={{ marginRight: 5 }} />
      </Button>
      {menuOpen && (
        <SaveReportMenu
          onClose={() => setMenuOpen(false)}
          reportId={reportId}
          onMenuSelect={onMenuSelect}
        />
      )}
      {nameOpen && (
        <SaveReportName
          onClose={() => setNameOpen(false)}
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
