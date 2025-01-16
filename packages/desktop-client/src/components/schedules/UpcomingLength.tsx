import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { type SyncedPrefs } from 'loot-core/types/prefs';

import { useSyncedPref } from '../../hooks/useSyncedPref';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Paragraph } from '../common/Paragraph';
import { Select } from '../common/Select';
import { View } from '../common/View';

function useUpcomingLengthOptions() {
  const { t } = useTranslation();

  const upcomingLengthOptions: {
    value: SyncedPrefs['upcomingScheduledTransactionLength'];
    label: string;
  }[] = [
    { value: '1', label: t('1 day') },
    { value: '7', label: t('1 week') },
    { value: '14', label: t('2 weeks') },
    { value: '30', label: t('1 month') },
  ];

  return { upcomingLengthOptions };
}

export function UpcomingLength() {
  const { t } = useTranslation();
  const [_upcomingLength, setUpcomingLength] = useSyncedPref(
    'upcomingScheduledTransactionLength',
  );

  const { upcomingLengthOptions } = useUpcomingLengthOptions();

  const upcomingLength = _upcomingLength || '7';

  return (
    <Modal
      name="schedules-upcoming-length"
      containerProps={{ style: { width: 600 } }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Change upcoming length')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <Paragraph>
            <Trans>
              Change how many days in advance of the scheduled date a scheduled
              transaction appears in the account ledger as upcoming.
            </Trans>
          </Paragraph>
          <Paragraph>
            <Trans>
              This only affects how schedules are displayed and not how budget
              data is stored. It can be changed at any time.
            </Trans>
          </Paragraph>
          <View>
            <Select
              options={upcomingLengthOptions.map(x => [
                x.value || '7',
                x.label,
              ])}
              value={upcomingLength}
              onChange={newValue => setUpcomingLength(newValue)}
            />
          </View>
        </>
      )}
    </Modal>
  );
}
