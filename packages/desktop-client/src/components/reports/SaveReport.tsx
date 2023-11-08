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

export function SaveReportMenuButton({ reportId, filters, conditionsOp }) {
  let [nameOpen, setNameOpen] = useState(false);
  let [menuOpen, setMenuOpen] = useState(false);
  let [menuItem, setMenuItem] = useState(null);
  let [err, setErr] = useState(null);
  let [adding, setAdding] = useState(false);
  let inputRef = createRef<HTMLInputElement>();
  let name = reportId.name;
  let id = reportId.id;
  let res;
  let savedReport;

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

  function SaveReportMenu({ onClose, reportId }) {
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

  async function onAddUpdate() {
    if (adding) {
      //create new flow
      savedReport = {
        conditions: filters,
        conditionsOp: conditionsOp,
        name: name,
        status: 'saved',
      };
      res = await sendCatch('report-create', {
        state: savedReport,
      });
      savedReport = {
        ...savedReport,
        id: res.data,
      };
    } else {
      //rename flow
      savedReport = {
        conditions: reportId.conditions,
        conditionsOp: reportId.conditionsOp,
        id: reportId.id,
        name: name,
      };
      res = await sendCatch('report-update', {
        state: savedReport,
      });
    }
    if (res.error) {
      setErr(res.error.message);
    } else {
      setNameOpen(false);
      //onReloadSavedFilter(savedReport);
    }
  }

  function NameReport({ onClose }) {
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
                <Input inputRef={inputRef} onUpdate={e => (name = e)} />
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
          {'Unsaved Report'}&nbsp;
        </Text>
        <ExpandArrow width={8} height={8} style={{ marginRight: 5 }} />
      </Button>
      {menuOpen && (
        <SaveReportMenu
          onClose={() => setMenuOpen(false)}
          reportId={reportId}
        />
      )}
      {nameOpen && <NameReport onClose={() => setNameOpen(false)} />}
    </View>
  );
}
