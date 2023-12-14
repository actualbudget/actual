import React, { useEffect, createRef, useState } from 'react';

import { send, sendCatch } from 'loot-core/src/platform/client/fetch';

import ExpandArrow from '../../icons/v0/ExpandArrow';
import { theme } from '../../style';
import Button from '../common/Button';
import Input from '../common/Input';
import Menu from '../common/Menu';
import MenuTooltip from '../common/MenuTooltip';
import Stack from '../common/Stack';
import Text from '../common/Text';
import View from '../common/View';
import { FormField, FormLabel } from '../forms';

import Convert from './Convert';

function SaveReportMenu({ reportId, onClose, onMenuSelect }) {
  return (
    <MenuTooltip width={150} onClose={onClose}>
      <Menu
        onMenuSelect={item => {
          onMenuSelect(item);
        }}
        items={[
          ...(reportId.length === 0
            ? [
                { name: 'save-report', text: 'Save new report' },
                { name: 'reset-report', text: 'Reset to default' },
              ]
            : [
                ...(reportId.id !== null && reportId.status === 'saved'
                  ? [
                      { name: 'rename-report', text: 'Rename' },
                      { name: 'delete-report', text: 'Delete' },
                      { name: 'menu-line', type: Menu.line },
                      {
                        name: 'save-report',
                        text: 'Save new report',
                        disabled: true,
                      },
                      { name: 'reset-report', text: 'Reset to default' },
                    ]
                  : [
                      { name: 'rename-report', text: 'Rename' },
                      { name: 'update-report', text: 'Update report' },
                      { name: 'reload-report', text: 'Revert changes' },
                      { name: 'delete-report', text: 'Delete' },
                      { name: 'menu-line', type: Menu.line },
                      { name: 'save-report', text: 'Save new report' },
                      { name: 'reset-report', text: 'Reset to default' },
                    ]),
              ]),
        ]}
      />
    </MenuTooltip>
  );
}

function NameReport({
  onClose,
  menuItem,
  onNameChange,
  inputRef,
  onAddUpdate,
  err,
}) {
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <MenuTooltip width={325} onClose={onClose}>
      {menuItem !== 'update-report' && (
        <form>
          <Stack
            direction="row"
            justify="flex-end"
            align="center"
            style={{ padding: 10 }}
          >
            <FormField style={{ flex: 1 }}>
              <FormLabel
                title="Filter Name"
                htmlFor="name-field"
                style={{ userSelect: 'none' }}
              />
              <Input inputRef={inputRef} onUpdate={e => onNameChange(e)} />
            </FormField>
            <Button
              type="primary"
              style={{ marginTop: 18 }}
              onClick={e => {
                e.preventDefault();
                onAddUpdate();
              }}
            >
              {menuItem === 'save-report' ? 'Add' : 'Update'}
            </Button>
          </Stack>
        </form>
      )}
      {err && (
        <Stack direction="row" align="center" style={{ padding: 10 }}>
          <Text style={{ color: theme.errorText }}>{err}</Text>
        </Stack>
      )}
    </MenuTooltip>
  );
}

export function SaveReportMenuButton({
  reportId,
  start,
  end,
  mode,
  groupBy,
  balanceType,
  empty,
  hidden,
  uncat,
  graphType,
  viewLabels,
  viewLegend,
  viewSummary,
  filters,
  conditionsOp,
  selectedCategories,
  onReportChange,
  onResetReports,
  data,
}) {
  let [nameOpen, setNameOpen] = useState(false);
  let [menuOpen, setMenuOpen] = useState(false);
  let [menuItem, setMenuItem] = useState(null);
  let [err, setErr] = useState(null);
  let [name, setName] = useState(reportId.name);
  let inputRef = createRef<HTMLInputElement>();
  let id = reportId.id;
  let savedReport;

  const onAddUpdate = async () => {
    let savedReport;
    let res;
    //save existing states
    savedReport = {
      ...reportId,
      mode: mode,
      group_by: groupBy,
      balance_type: balanceType,
      show_empty: Convert(empty),
      show_offbudgethidden: Convert(hidden),
      show_uncategorized: Convert(uncat),
      graph_type: graphType,
      selected_categories: selectedCategories,
      conditions: filters,
      conditions_op: conditionsOp,
      name: name,
      start_date: start,
      end_date: end,
      data: data,
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
          name: name,
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
        <ExpandArrow width={8} height={8} style={{ marginRight: 5 }} />
      </Button>
      {menuOpen && (
        <SaveReportMenu
          onClose={() => setMenuOpen(false)}
          reportId={reportId}
          onMenuSelect={onMenuSelect}
        />
      )}
      {nameOpen && (
        <NameReport
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
