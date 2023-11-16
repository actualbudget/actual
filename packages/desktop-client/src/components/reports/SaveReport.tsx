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
                { name: 'clear-report', text: 'Reset to default' },
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
                      { name: 'clear-report', text: 'Reset to default' },
                    ]
                  : [
                      { name: 'rename-report', text: 'Rename' },
                      { name: 'update-report', text: 'Update report' },
                      { name: 'reload-report', text: 'Revert changes' },
                      { name: 'delete-report', text: 'Delete' },
                      { name: 'menu-line', type: Menu.line },
                      { name: 'save-report', text: 'Save new report' },
                      { name: 'clear-report', text: 'Reset to default' },
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
  onName,
  inputRef,
  onAddUpdate,
  adding,
  err,
}) {
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
              <Input inputRef={inputRef} onUpdate={e => onName(e)} />
            </FormField>
            <Button
              type="primary"
              style={{ marginTop: 18 }}
              onClick={e => {
                e.preventDefault();
                onAddUpdate();
              }}
            >
              {adding ? 'Add' : 'Update'}
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
  onReportChange,
  data,
}) {
  let [nameOpen, setNameOpen] = useState(false);
  let [menuOpen, setMenuOpen] = useState(false);
  let [menuItem, setMenuItem] = useState(null);
  let [err, setErr] = useState(null);
  let [name, setName] = useState(reportId.name);
  let [adding, setAdding] = useState(false);
  let inputRef = createRef<HTMLInputElement>();
  let id = reportId.id;
  let res;
  let savedReport;

  const onAddUpdate = async () => {
    let savedReport;
    let res;
    if (adding) {
      //create new flow
      savedReport = {
        mode: mode,
        groupBy: groupBy,
        balanceType: balanceType,
        empty: Convert(empty),
        hidden: Convert(hidden),
        uncat: Convert(uncat),
        graphType: graphType,
        viewLabels: Convert(viewLabels),
        viewLegend: Convert(viewLegend),
        viewSummary: Convert(viewSummary),
        conditions: filters,
        conditionsOp: conditionsOp,
        name: name,
        start: start,
        end: end,
        data: data,
        status: 'saved',
      };
      const { status, ...sendSaved } = savedReport;
      res = await sendCatch('report-create', {
        state: sendSaved,
      });
      savedReport = {
        ...savedReport,
        id: res.data,
      };
    } else {
      //rename flow
      savedReport = {
        ...reportId,
        name: name,
      };
      res = await sendCatch('report-update', {
        state: savedReport,
      });
    }
    if (res.error) {
      onErr(res.error.message);
    } else {
      onNameChange(false);
      onReportChange(savedReport);
      //onReloadSavedFilter(savedReport);
    }
  };

  const onName = cond => {
    setName(cond);
  };

  const onErr = cond => {
    setErr(cond);
  };

  const onNameChange = cond => {
    setNameOpen(cond);
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [NameReport]);

  const onMenuSelect = async item => {
    setMenuItem(item);
    switch (item) {
      case 'rename-report':
        setErr(null);
        setAdding(false);
        setMenuOpen(false);
        setNameOpen(true);
        break;
      case 'delete-report':
        setMenuOpen(false);
        await send('report-delete', id);
        //onClearFilters();
        break;
      case 'update-report':
        setErr(null);
        setAdding(false);
        setMenuOpen(false);
        savedReport = {
          conditions: filters,
          conditionsOp: conditionsOp,
          id: reportId.id,
          name: reportId.name,
          status: 'saved',
        };
        res = await sendCatch('report-update', {
          state: savedReport,
        });
        if (res.error) {
          setErr(res.error.message);
          setNameOpen(true);
        } else {
          //onReloadSavedFilter(savedReport, 'update');
        }
        break;
      case 'save-report':
        setErr(null);
        setAdding(true);
        setMenuOpen(false);
        setNameOpen(true);
        break;
      case 'reload-report':
        setMenuOpen(false);
        savedReport = {
          status: 'saved',
        };
        //onReloadSavedFilter(savedReport, 'reload');
        break;
      case 'clear-report':
        setMenuOpen(false);
        //onClearFilters();
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
          onName={onName}
          inputRef={inputRef}
          onAddUpdate={onAddUpdate}
          adding={adding}
          err={err}
        />
      )}
    </View>
  );
}
