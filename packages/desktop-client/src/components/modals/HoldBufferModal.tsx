import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import {
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@actual-app/components/tabs';
import { Text } from '@actual-app/components/text';
import { View } from '@actual-app/components/view';
import { send } from '@actual-app/core/platform/client/connection';

import { useEnvelopeSheetValue } from '#components/budget/envelope/EnvelopeBudgetComponents';
import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { Checkbox } from '#components/forms';
import { FieldLabel } from '#components/mobile/MobileForms';
import { AmountInput } from '#components/util/AmountInput';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useSyncedPref } from '#hooks/useSyncedPref';
import type { Modal as ModalType } from '#modals/modalsSlice';
import { envelopeBudget } from '#spreadsheet/bindings';

type HoldBufferModalProps = Extract<
  ModalType,
  { name: 'hold-buffer' }
>['options'];

export function HoldBufferModal(props: HoldBufferModalProps) {
  const { t } = useTranslation();
  const isAutoHoldEnabled = useFeatureFlag('autoHoldForNextMonth');

  const content = isAutoHoldEnabled ? (
    <Tabs
      defaultSelectedKey="auto"
      style={{ padding: styles.mobileEditingPadding, gap: 20, marginTop: -15 }}
    >
      <View style={{ alignItems: 'center' }}>
        <TabList aria-label={t('Automatic holding')}>
          <Tab id="auto">
            <Trans>Auto</Trans>
          </Tab>
          <Tab id="manual">
            <Trans>Manual</Trans>
          </Tab>
        </TabList>
      </View>
      <TabPanels>
        <TabPanel id="auto">
          <HoldBufferModalAuto {...props} />
        </TabPanel>
        <TabPanel id="manual">
          <HoldBufferModalManual {...props} />
        </TabPanel>
      </TabPanels>
    </Tabs>
  ) : (
    <HoldBufferModalManual {...props} />
  );

  return (
    <Modal name="hold-buffer">
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Hold for next month')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          {content}
        </>
      )}
    </Modal>
  );
}

function HoldBufferModalManual({ onSubmit }: HoldBufferModalProps) {
  const { t } = useTranslation();
  const [hideFraction] = useSyncedPref('hideFraction');
  const available = useEnvelopeSheetValue(envelopeBudget.toBudget) ?? 0;
  const [amount, setAmount] = useState<number>(0);

  useEffect(() => {
    setAmount(available);
  }, [available]);

  const _onSubmit = (newAmount: number) => {
    if (newAmount) {
      onSubmit?.(newAmount);
    }
  };

  return (
    <>
      <View>
        <FieldLabel title={t('Hold this amount:')} style={{ marginTop: 0 }} />
        <InitialFocus>
          <AmountInput
            value={amount}
            autoDecimals={String(hideFraction) !== 'true'}
            zeroSign="+"
            style={{
              marginLeft: styles.mobileEditingPadding,
              marginRight: styles.mobileEditingPadding,
            }}
            inputStyle={{
              height: styles.mobileMinHeight,
            }}
            onUpdate={setAmount}
            onEnter={() => _onSubmit(amount)}
          />
        </InitialFocus>
      </View>
      <View
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: 10,
        }}
      >
        <Button
          variant="primary"
          style={{
            height: styles.mobileMinHeight,
            marginLeft: styles.mobileEditingPadding,
            marginRight: styles.mobileEditingPadding,
          }}
          onPress={() => _onSubmit(amount)}
        >
          <Trans>Hold</Trans>
        </Button>
      </View>
    </>
  );
}

function HoldBufferModalAuto({ month, onAutoHold }: HoldBufferModalProps) {
  const { t } = useTranslation();
  const [months, setMonths] = useState('1');
  const [allowNegativeToBudget, setAllowNegativeToBudget] = useState(false);
  const monthsToInspect = Number(months);
  const isMonthsValid =
    months !== '' && Number.isInteger(monthsToInspect) && monthsToInspect >= 0;

  useEffect(() => {
    let isCurrent = true;

    void send('budget/get-auto-hold-months', { month }).then(
      defaultMonths => {
        if (isCurrent) {
          setMonths(String(Number.isFinite(defaultMonths) ? defaultMonths : 0));
        }
      },
      () => {
        // ignore errors
      },
    );

    return () => {
      isCurrent = false;
    };
  }, [month]);

  return (
    <View style={{ gap: 10 }}>
      <View>
        <FieldLabel title={t('Months ahead:')} style={{ marginTop: 0 }} />
        <InitialFocus>
          <Input
            type="number"
            min={0}
            step={1}
            required
            value={months}
            aria-label={t('Months ahead')}
            onChange={e => setMonths(e.currentTarget.value)}
            style={{ height: styles.mobileMinHeight }}
          />
        </InitialFocus>
      </View>
      {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label style={{ display: 'flex', gap: 8 }}>
        <Checkbox
          checked={allowNegativeToBudget}
          onChange={() => setAllowNegativeToBudget(value => !value)}
        />
        <Text>
          <Trans>Allow negative "To Budget"</Trans>
        </Text>
      </label>
      <View style={{ alignItems: 'center' }}>
        <Button
          variant="primary"
          isDisabled={!isMonthsValid}
          style={{ height: styles.mobileMinHeight }}
          onPress={() => {
            if (!isMonthsValid) {
              return;
            }

            onAutoHold(monthsToInspect, allowNegativeToBudget);
          }}
        >
          <Trans>Hold</Trans>
        </Button>
      </View>
    </View>
  );
}
