import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';

import { useNavigate } from '#hooks/useNavigate';

export function AddRuleButton() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const handleAddRule = useCallback(() => {
    // Carry the rules list filter so it is restored when coming back.
    void navigate(`/rules/new${location.search}`);
  }, [navigate, location.search]);

  return (
    <Button
      variant="bare"
      aria-label={t('Add new rule')}
      style={{ margin: 10 }}
      onPress={handleAddRule}
    >
      <SvgAdd width={20} height={20} />
    </Button>
  );
}
