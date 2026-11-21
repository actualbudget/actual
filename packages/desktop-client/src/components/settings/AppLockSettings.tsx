import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Checkbox } from '#components/forms';
import { setAppLockEnabled } from '#util/appLock';
import type { AppLockStatus } from '#util/appLock';

import { SettingsRow } from './SettingsRow';

type AppLockSettingsProps = {
  status: AppLockStatus;
  onStatusChange: (status: AppLockStatus) => void;
};

export function AppLockSettings({
  status,
  onStatusChange,
}: AppLockSettingsProps) {
  const { t } = useTranslation();
  const [isChanging, setIsChanging] = useState(false);

  async function onChange(enabled: boolean) {
    setIsChanging(true);
    try {
      onStatusChange(
        await setAppLockEnabled(
          enabled,
          enabled ? t('Turn on app lock') : t('Turn off app lock'),
        ),
      );
    } finally {
      setIsChanging(false);
    }
  }

  function getDescription({ isAvailable, biometry }: AppLockStatus) {
    if (!isAvailable) {
      return t('Set a passcode on this device to use the app lock.');
    }
    switch (biometry) {
      case 'faceId':
        return t('Require Face ID or the device passcode to open Actual.');
      case 'touchId':
        return t('Require Touch ID or the device passcode to open Actual.');
      case 'opticId':
        return t('Require Optic ID or the device passcode to open Actual.');
      case 'biometrics':
        return t('Require biometrics or the device passcode to open Actual.');
      default:
        return t('Require the device passcode to open Actual.');
    }
  }

  return (
    <SettingsRow
      htmlFor="settings-appLock"
      title={t('App lock')}
      description={getDescription(status)}
      control={
        <Checkbox
          id="settings-appLock"
          checked={status.isEnabled}
          // Turning the lock off stays possible if the passcode was removed.
          disabled={isChanging || (!status.isAvailable && !status.isEnabled)}
          onChange={e => void onChange(e.currentTarget.checked)}
          style={{ marginRight: 0 }}
        />
      }
    />
  );
}
