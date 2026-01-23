import React from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgViewHide, SvgViewShow } from '@actual-app/components/icons/v2';
import { type CSSProperties } from '@actual-app/components/styles';

import { useSyncedPref } from '@desktop-client/hooks/useSyncedPref';

type PrivacyButtonProps = {
  style?: CSSProperties;
  isMobile?: boolean;
};

export function PrivacyButton({ style, isMobile }: PrivacyButtonProps) {
  const { t } = useTranslation();
  const [isPrivacyEnabledPref, setPrivacyEnabledPref] =
    useSyncedPref('isPrivacyEnabled');
  const isPrivacyEnabled = String(isPrivacyEnabledPref) === 'true';

  const privacyIconStyle = {
    width: isMobile ? 22 : 15,
    height: isMobile ? 22 : 15,
  };

  useHotkeys(
    'shift+ctrl+p, shift+cmd+p, shift+meta+p',
    () => {
      setPrivacyEnabledPref(String(!isPrivacyEnabled));
    },
    {
      preventDefault: true,
      scopes: ['app'],
    },
    [setPrivacyEnabledPref, isPrivacyEnabled],
  );

  return (
    <Button
      variant="bare"
      aria-label={
        isPrivacyEnabled ? t('Disable privacy mode') : t('Enable privacy mode')
      }
      onPress={() => setPrivacyEnabledPref(String(!isPrivacyEnabled))}
      style={style}
    >
      {isPrivacyEnabled ? (
        <SvgViewHide style={privacyIconStyle} />
      ) : (
        <SvgViewShow style={privacyIconStyle} />
      )}
    </Button>
  );
}
