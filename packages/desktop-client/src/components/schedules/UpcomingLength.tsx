import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Paragraph } from '@actual-app/components/paragraph';
import { Select } from '@actual-app/components/select';
import { View } from '@actual-app/components/view';

import { type SyncedPrefs } from 'loot-core/types/prefs';

import { CustomUpcomingLength } from './CustomUpcomingLength';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

function useUpcomingLengthOptions() {
  const { t } = useTranslation();

  const upcomingLengthOptions: {
    value: SyncedPrefs['upcomingScheduledTransactionLength'];
    label: string;
  }[] = [
    { value: '1', label: t('1 day') },
    { value: '7', label: t('1 week') },
    { value: '14', label: t('2 weeks') },
    { value: 'oneMonth', label: t('1 month') },
    { value: 'currentMonth', label: t('End of the current month') },
    { value: 'custom', label: t('Custom length') },
  ];

  return { upcomingLengthOptions };
}

function nonCustomUpcomingLengthValues(value: string) {
  return (
    ['1', '7', '14', 'oneMonth', 'currentMonth'].findIndex(x => x === value) ===
    -1
  );
}

export function UpcomingLength() {
  const { t } = useTranslation();
  const [_upcomingLength, setUpcomingLength] = useSyncedPref(
    'upcomingScheduledTransactionLength',
  );

  const saveUpcomingLength = () => {
    setUpcomingLength(tempUpcomingLength);
  };

  const { upcomingLengthOptions } = useUpcomingLengthOptions();

  const upcomingLength = _upcomingLength || '7';

  const [tempUpcomingLength, setTempUpcomingLength] = useState(upcomingLength);
  const [useCustomLength, setUseCustomLength] = useState(
    nonCustomUpcomingLengthValues(tempUpcomingLength),
  );
  const [saveActive, setSaveActive] = useState(false);

  useEffect(() => {
    if (tempUpcomingLength !== upcomingLength) {
      setSaveActive(true);
    } else {
      setSaveActive(false);
    }
  }, [tempUpcomingLength, upcomingLength]);

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
              value={
                nonCustomUpcomingLengthValues(tempUpcomingLength)
                  ? 'custom'
                  : tempUpcomingLength
              }
              onChange={newValue => {
                setUseCustomLength(newValue === 'custom');
                setTempUpcomingLength(newValue);
              }}
            />
            {useCustomLength && (
              <CustomUpcomingLength
                onChange={setTempUpcomingLength}
                tempValue={tempUpcomingLength}
              />
            )}
          </View>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'end',
              marginTop: 20,
            }}
          >
            <Button
              isDisabled={!saveActive}
              onPress={() => {
                saveUpcomingLength();
                close();
              }}
              type="submit"
              variant="primary"
            >
              <Trans>Save</Trans>
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
