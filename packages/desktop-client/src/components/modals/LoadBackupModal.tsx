import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';

import * as dateFns from 'date-fns';

import {
  addNotification,
  loadBackup,
  makeBackup,
} from 'loot-core/client/actions';
import { type Backup } from 'loot-core/server/backups';
import { send, listen, unlisten } from 'loot-core/src/platform/client/fetch';

import { useMetadataPref } from '../../hooks/useMetadataPref';
import { theme } from '../../style';
import { Block } from '../common/Block';
import { ButtonWithLoading } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Text } from '../common/Text';
import { View } from '../common/View';
import { Row, Cell } from '../table';

type BackupTableProps = {
  backups: Backup[];
  onSelect: (backupId: string) => void;
};

function BackupTable({ backups, onSelect }: BackupTableProps) {
  const { t } = useTranslation();
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
            value={
              backup.date
                ? dateFns.format(backup.date, 'yyyy-MM-dd H:mm')
                : t('Revert to Latest')
            }
            valueStyle={{ paddingLeft: 20 }}
          />
        </Row>
      ))}
    </View>
  );
}

type LoadBackupModalProps = {
  budgetId: string;
  watchUpdates: boolean;
  backupDisabled: boolean;
};

export function LoadBackupModal({
  budgetId,
  watchUpdates,
  backupDisabled,
}: LoadBackupModalProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState<'revert' | 'backup' | null>(null);
  const [prefsBudgetId] = useMetadataPref('id');
  const budgetIdToLoad = budgetId ?? prefsBudgetId;

  useEffect(() => {
    send('backups-get', { id: budgetIdToLoad }).then(setBackups);
  }, [budgetIdToLoad]);

  useEffect(() => {
    if (watchUpdates) {
      listen('backups-updated', setBackups);
      return () => unlisten('backups-updated');
    }
  }, [watchUpdates]);

  const latestBackup = backups.find(backup =>
    'isLatest' in backup ? backup.isLatest : false,
  );
  const previousBackups = backups.filter(
    backup => !('isLatest' in backup ? backup.isLatest : false),
  );

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
                      {t('You are currently working from a backup.')}
                    </Text>{' '}
                    {t(
                      'You can load a different backup or revert to the original version below.',
                    )}
                  </Block>
                  <ButtonWithLoading
                    variant="primary"
                    isDisabled={loading != null}
                    isLoading={loading === 'revert'}
                    onPress={async () => {
                      setLoading('revert');
                      try {
                        await dispatch(
                          loadBackup(budgetIdToLoad, latestBackup.id),
                        );
                        dispatch(
                          addNotification({
                            type: 'message',
                            message: t(
                              'Budget reverted from backup to original version.',
                            ),
                          }),
                        );
                      } catch (error) {
                        console.error('Failed to revert backup:', error);
                        dispatch(
                          addNotification({
                            type: 'error',
                            message: t('Failed to revert to original version.'),
                          }),
                        );
                      } finally {
                        setLoading(null);
                      }
                    }}
                  >
                    {t('Revert to original version')}
                  </ButtonWithLoading>
                </Block>
              ) : (
                <View style={{ alignItems: 'flex-start' }}>
                  <Block style={{ marginBottom: 10 }}>
                    {t(
                      'Select a backup to load. After loading a backup, you will have a chance to revert to the current version in this screen.',
                    )}{' '}
                    <Text style={{ fontWeight: 600 }}>
                      {t(
                        'If you use a backup, you will have to setup all your devices to sync from the new budget.',
                      )}
                    </Text>
                  </Block>
                  <ButtonWithLoading
                    variant="primary"
                    isDisabled={backupDisabled || loading != null}
                    isLoading={loading === 'backup'}
                    onPress={async () => {
                      setLoading('backup');
                      try {
                        await dispatch(makeBackup());
                        dispatch(
                          addNotification({
                            type: 'message',
                            message: t('Backup Created'),
                          }),
                        );
                      } catch (error) {
                        console.error('Failed to create backup:', error);
                        dispatch(
                          addNotification({
                            type: 'error',
                            message: t('Failed to create backup.'),
                          }),
                        );
                      } finally {
                        setLoading(null);
                      }
                    }}
                  >
                    {t('Backup now')}
                  </ButtonWithLoading>
                </View>
              )}
            </View>
            {previousBackups.length === 0 ? (
              <Block style={{ color: theme.tableTextLight, marginLeft: 20 }}>
                {t('No backups available')}
              </Block>
            ) : (
              <BackupTable
                backups={previousBackups}
                onSelect={id => {
                  try {
                    dispatch(loadBackup(budgetIdToLoad, id));
                  } catch (error) {
                    dispatch(
                      addNotification({
                        type: 'error',
                        message: t('Unable to load backup.'),
                      }),
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
