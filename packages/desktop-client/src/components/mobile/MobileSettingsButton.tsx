import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCog } from '@actual-app/components/icons/v1';

import { useFeatureFlag } from '#hooks/useFeatureFlag';
import { useNavigate } from '#hooks/useNavigate';

export function MobileSettingsButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isSimpleNavbar = useFeatureFlag('simpleMobileNavbar');

  // With the legacy navbar, settings is reachable from the expanded tray.
  if (!isSimpleNavbar) {
    return null;
  }

  return (
    <Button
      variant="bare"
      aria-label={t('Settings')}
      style={{ margin: '10px 10px 10px 0' }}
      onPress={() => void navigate('/settings')}
    >
      <SvgCog width={20} height={20} />
    </Button>
  );
}
