import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Paragraph } from '@actual-app/components/paragraph';
import { Select } from '@actual-app/components/select';
import { View } from '@actual-app/components/view';
import {
  DEFAULT_UPCOMING_SCHEDULE_DAYS,
  isCustomUpcomingLength,
  UPCOMING_LENGTH_PRESET_OPTIONS,
} from '@actual-app/core/shared/schedules';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { useSyncedPref } from '#hooks/useSyncedPref';

import { CustomUpcomingLength } from './CustomUpcomingLength';

function useUpcomingLengthOptions() {
  const { t } = useTranslation();

  const upcomingLengthOptions: Array<{ value: string; label: string }> =
    UPCOMING_LENGTH_PRESET_OPTIONS.map(o => ({
      value: o.value,
      label: t(o.labelKey),
    }));

  upcomingLengthOptions.push({ value: 'custom', label: t('Custom length') });

  return { upcomingLengthOptions };
}

function nonCustomUpcomingLengthValues(value: string) {
  return isCustomUpcomingLength(value);
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

  const upcomingLength = _upcomingLength || DEFAULT_UPCOMING_SCHEDULE_DAYS;

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
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Change upcoming length')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
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
                x.value || DEFAULT_UPCOMING_SCHEDULE_DAYS,
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
                state.close();
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
