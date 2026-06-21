import React, { useEffect, useState } from 'react';
import { Form } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
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
import type { IntegerAmount } from '@actual-app/core/shared/util';

import { Checkbox } from '#components/forms';
import { FinancialInput } from '#components/util/FinancialInput';
import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useSheetValue } from '#hooks/useSheetValue';

type HoldMenuProps = {
  month: string;
  onSubmit: (amount: number) => void;
  onAutoHold: (months: number, allowNegativeToBudget: boolean) => void;
  onClose: () => void;
};

export function HoldMenu(props: HoldMenuProps) {
  const { t } = useTranslation();
  const isAutoHoldEnabled = useFeatureFlag('autoHoldForNextMonth');

  if (!isAutoHoldEnabled) {
    return (
      <View style={{ padding: 10 }}>
        <HoldMenuManual {...props} />
      </View>
    );
  }

  return (
    <Tabs defaultSelectedKey="auto" style={{ padding: 10 }}>
      <View
        style={{
          alignItems: 'center',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
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
          <HoldMenuAuto {...props} />
        </TabPanel>
        <TabPanel id="manual">
          <HoldMenuManual {...props} />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}

function HoldMenuManual({ onSubmit, onClose }: HoldMenuProps) {
  const [amount, setAmount] = useState<IntegerAmount | null>(null);

  useSheetValue<'envelope-budget', 'to-budget'>('to-budget', ({ value }) => {
    setAmount(Math.max(value || 0, 0));
  });

  if (amount === null) {
    // See `TransferMenu` for more info about this
    return null;
  }

  return (
    <Form
      onSubmit={e => {
        e.preventDefault();
        onSubmit(amount);
        onClose();
      }}
    >
      <View>
        <View style={{ marginBottom: 5 }}>
          <Trans>Hold this amount:</Trans>
        </View>
        <View>
          <InitialFocus>
            <FinancialInput value={amount} onChangeValue={setAmount} />
          </InitialFocus>
        </View>
        <View
          style={{
            alignItems: 'flex-end',
            marginTop: 10,
          }}
        >
          <Button
            type="submit"
            variant="primary"
            style={{
              fontSize: 12,
              paddingTop: 3,
              paddingBottom: 3,
            }}
          >
            <Trans>Hold</Trans>
          </Button>
        </View>
      </View>
    </Form>
  );
}

function HoldMenuAuto({ month, onAutoHold, onClose }: HoldMenuProps) {
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
    <Form
      onSubmit={e => {
        e.preventDefault();

        if (!isMonthsValid) {
          return;
        }

        onAutoHold(monthsToInspect, allowNegativeToBudget);
        onClose();
      }}
    >
      <View>
        <View style={{ marginBottom: 5 }}>
          <Trans>Months ahead:</Trans>
        </View>
        <InitialFocus>
          <Input
            type="number"
            min={0}
            step={1}
            required
            value={months}
            aria-label={t('Months ahead')}
            onChange={e => setMonths(e.currentTarget.value)}
          />
        </InitialFocus>
        {/* oxlint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 10,
          }}
        >
          <Checkbox
            checked={allowNegativeToBudget}
            onChange={() => setAllowNegativeToBudget(value => !value)}
          />
          <Text>
            <Trans>Allow negative "To Budget"</Trans>
          </Text>
        </label>
        <View
          style={{
            alignItems: 'flex-end',
            marginTop: 10,
          }}
        >
          <Button
            type="submit"
            variant="primary"
            isDisabled={!isMonthsValid}
            style={{
              fontSize: 12,
              paddingTop: 3,
              paddingBottom: 3,
            }}
          >
            <Trans>Hold</Trans>
          </Button>
        </View>
      </View>
    </Form>
  );
}
