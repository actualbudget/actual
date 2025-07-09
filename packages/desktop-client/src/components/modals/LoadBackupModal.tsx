import React, { useState, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Block } from '@actual-app/components/block';
import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { send, listen } from 'loot-core/platform/client/fetch';
import { type Backup } from 'loot-core/server/budgetfiles/backups';

import { loadBackup, makeBackup } from '@desktop-client/budgets/budgetsSlice';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { Row, Cell } from '@desktop-client/components/table';
import { useMetadataPref } from '@desktop-client/hooks/useMetadataPref';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

type BackupTableProps = {
  backups: Backup[];
  onSelect: (backupId: string) => void;
};

function BackupTable({ backups, onSelect }: BackupTableProps) {
  return (
    <View style={{ flex: 1, maxHeight: 200, overflow: 'auto' }}>
      {backups.map((backup, idx) => (
        <Row
          key={backup.id}
          collapsed={idx !== 0}
          onClick={() => onSelect(backup.id)}
          style={{ cursor: 'pointer' }}
        >
          <Cell
            width="flex"
            value={backup.date ? backup.date : 'Revert to Latest'}
            valueStyle={{ paddingLeft: 20 }}
          />
        </Row>
      ))}
    </View>
  );
}

type LoadBackupModalProps = Extract<
  ModalType,
  { name: 'load-backup' }
>['options'];

export function LoadBackupModal({
  budgetId,
  watchUpdates,
  backupDisabled,
}: LoadBackupModalProps) {
  const dispatch = useDispatch();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [prefsBudgetId] = useMetadataPref('id');
  const budgetIdToLoad = budgetId ?? prefsBudgetId;

  useEffect(() => {
    if (budgetIdToLoad) {
      send('backups-get', { id: budgetIdToLoad }).then(setBackups);
    }
  }, [budgetIdToLoad]);

  useEffect(() => {
    if (watchUpdates) {
      return listen('backups-updated', setBackups);
    }
  }, [watchUpdates]);

  const latestBackup = backups.find(backup =>
    'isLatest' in backup ? backup.isLatest : false,
  );
  const previousBackups = backups.filter(
    backup => !('isLatest' in backup ? backup.isLatest : false),
  );
  const { t } = useTranslation();

  return (
    <Modal name="load-backup" containerProps={{ style: { maxWidth: '30vw' } }}>
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Load Backup')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <View style={{ marginBottom: 30 }}>
            <View
              style={{
                margin: 20,
                marginTop: 0,
                marginBottom: 15,
                lineHeight: 1.5,
              }}
            >
              {latestBackup ? (
                <Block>
                  <Block style={{ marginBottom: 10 }}>
                    <Text style={{ fontWeight: 600 }}>
                      <Trans>You are currently working from a backup.</Trans>
                    </Text>{' '}
                    <Trans>
                      You can load a different backup or revert to the original
                      version below.
                    </Trans>
                  </Block>
                  <Button
                    variant="primary"
                    onPress={() => {
                      if (budgetIdToLoad && latestBackup.id) {
                        dispatch(
                          loadBackup({
                            budgetId: budgetIdToLoad,
                            backupId: latestBackup.id,
                          }),
                        );
                      }
                    }}
                  >
                    <Trans>Revert to original version</Trans>
                  </Button>
                </Block>
              ) : (
                <View style={{ alignItems: 'flex-start' }}>
                  <Block style={{ marginBottom: 10 }}>
                    <Trans>
                      Select a backup to load. After loading a backup, you will
                      have a chance to revert to the current version in this
                      screen.
                    </Trans>{' '}
                    <Text style={{ fontWeight: 600 }}>
                      <Trans>
                        If you use a backup, you will have to set up all your
                        devices to sync from the new budget.
                      </Trans>
                    </Text>
                  </Block>
                  <Button
                    variant="primary"
                    isDisabled={backupDisabled}
                    onPress={() => dispatch(makeBackup())}
                  >
                    <Trans>Back up now</Trans>
                  </Button>
                </View>
              )}
            </View>
            {previousBackups.length === 0 ? (
              <Block style={{ color: theme.tableTextLight, marginLeft: 20 }}>
                <Trans>No backups available</Trans>
              </Block>
            ) : (
              <BackupTable
                backups={previousBackups}
                onSelect={id => {
                  if (budgetIdToLoad && id) {
                    dispatch(
                      loadBackup({ budgetId: budgetIdToLoad, backupId: id }),
                    );
                  }
                }}
              />
            )}
          </View>
        </>
      )}
    </Modal>
  );
}
