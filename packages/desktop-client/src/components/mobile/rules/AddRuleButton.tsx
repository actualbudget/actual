import React, { useCallback } from 'react';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';

import { useNavigate } from '@desktop-client/hooks/useNavigate';

type AddRuleButtonProps = {
  onRuleAdded: () => void;
};

export function AddRuleButton({ onRuleAdded }: AddRuleButtonProps) {
  const navigate = useNavigate();

  const handleAddRule = useCallback(() => {
    navigate('/rules/edit', {
      state: {
        onRuleSaved: onRuleAdded,
      },
    });
  }, [navigate, onRuleAdded]);

  return (
    <Button variant="bare" aria-label="Add new rule" onPress={handleAddRule}>
      <SvgAdd width={20} height={20} />
    </Button>
  );
}
