import React, { createRef, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgExpandArrow } from '@actual-app/components/icons/v0';
import { Popover } from '@actual-app/components/popover';
import { Select } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';

import { send } from 'loot-core/platform/client/connection';
import type {
  CustomReportEntity,
  DashboardEntity,
} from 'loot-core/types/models';

import { LoadingIndicator } from './LoadingIndicator';
import { SaveReportChoose } from './SaveReportChoose';
import { SaveReportDelete } from './SaveReportDelete';
import { SaveReportMenu } from './SaveReportMenu';
import type { SavedStatus } from './SaveReportMenu';
import { SaveReportName } from './SaveReportName';

import { FormField, FormLabel } from '@desktop-client/components/forms';
import { useDashboardPages } from '@desktop-client/hooks/useDashboard';
import { useReports } from '@desktop-client/hooks/useReports';
import {
  useCreateReportMutation,
  useDeleteReportMutation,
  useUpdateReportMutation,
} from '@desktop-client/reports/mutations';

type SaveReportProps<T extends CustomReportEntity = CustomReportEntity> = {
  customReportItems: T;
  report: CustomReportEntity;
  savedStatus: SavedStatus;
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
  dashboardPages: readonly DashboardEntity[];
};

export function SaveReportWrapper<
  T extends CustomReportEntity = CustomReportEntity,
>(props: Omit<SaveReportProps<T>, 'dashboardPages'>) {
  const { t } = useTranslation();
  const { data, isLoading } = useDashboardPages();

  if (isLoading) {
    return <LoadingIndicator message={t('Loading dashboards...')} />;
  }

  return <SaveReport {...props} dashboardPages={data} />;
}

export function SaveReport({
  customReportItems,
  report,
  savedStatus,
  onReportChange,
  dashboardPages,
}: SaveReportProps) {
  const { data: listReports = [] } = useReports();
  const triggerRef = useRef(null);
  const [deleteMenuOpen, setDeleteMenuOpen] = useState(false);
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [chooseMenuOpen, setChooseMenuOpen] = useState(false);
  const [menuItem, setMenuItem] = useState('');
  const [err, setErr] = useState('');
  const [newName, setNewName] = useState(report.name ?? '');
  const inputRef = createRef<HTMLInputElement>();
  const { t } = useTranslation();
  const [saveDashboardId, setSaveDashboardId] = useState<string | null>(
    dashboardPages.length > 0 ? dashboardPages[0].id : null,
  );

  const createReportMutation = useCreateReportMutation();
  const updateReportMutation = useUpdateReportMutation();

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

      if (!saveDashboardId) {
        setErr(t('Please select a dashboard to save the report'));
        return;
      }

      createReportMutation.mutate(
        { report: newSavedReport },
        {
          onSuccess: async id => {
            await send('dashboard-add-widget', {
              type: 'custom-report',
              width: 4,
              height: 2,
              meta: { id },
              dashboard_page_id: saveDashboardId,
            });

            setNameMenuOpen(false);
            onReportChange({
              savedReport: {
                ...newSavedReport,
                id,
              },
              type: 'add-update',
            });
          },
          onError: error => {
            setErr(error.message);
            setNameMenuOpen(true);
          },
        },
      );

      return;
    }

    const { name: _name, id: _id, ...props } = customReportItems;

    const updatedReport = {
      ...report,
      ...(menuChoice === 'rename-report' ? { name: newName } : props),
    };

    updateReportMutation.mutate(
      { report: updatedReport },
      {
        onSuccess: () => {
          setNameMenuOpen(false);
          onReportChange({
            savedReport: updatedReport,
            type: menuChoice === 'rename-report' ? 'rename' : 'add-update',
          });
        },
        onError: error => {
          setErr(error.message);
          setNameMenuOpen(true);
        },
      },
    );
  };

  const deleteReportMutation = useDeleteReportMutation();

  const onDelete = async () => {
    deleteReportMutation.mutate(
      { id: report.id },
      {
        onSuccess: () => {
          setNewName('');
          onReportChange({ type: 'reset' });
          setDeleteMenuOpen(false);
        },
      },
    );
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
        {savedStatus === 'modified' && (
          <Text>
            <Trans>(modified)</Trans>&nbsp;
          </Text>
        )}
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
        <View>
          <SaveReportName
            menuItem={menuItem}
            name={newName}
            setName={setNewName}
            inputRef={inputRef}
            onAddUpdate={onAddUpdate}
            err={err}
          />

          {menuItem === 'save-report' && (
            <View>
              <SpaceBetween
                style={{
                  padding: 15,
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                }}
              >
                <FormField style={{ flex: 1 }}>
                  <FormLabel
                    title={t('Dashboard')}
                    htmlFor="dashboard-select"
                    style={{ userSelect: 'none' }}
                  />
                  <Select
                    id="dashboard-select"
                    value={saveDashboardId}
                    onChange={v => setSaveDashboardId(v)}
                    defaultLabel={t('None')}
                    options={dashboardPages.map(d => [d.id, d.name])}
                    style={{ marginTop: 10, width: 300 }}
                  />
                </FormField>
              </SpaceBetween>
            </View>
          )}
        </View>
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
