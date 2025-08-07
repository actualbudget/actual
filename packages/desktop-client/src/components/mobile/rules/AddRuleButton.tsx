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
    console.log('DEBUG: handleAddRule called');
    alert('DEBUG: Add rule button pressed');
    navigate('/rules/edit', {
      state: {
        onRuleSaved: onRuleAdded,
      },
    });
    console.log('DEBUG: navigate called to /rules/edit');
  }, [navigate, onRuleAdded]);

  return (
    <Button
      variant="bare"
      aria-label="Add new rule"
      style={{ margin: 10 }}
      onPress={handleAddRule}
    >
      <SvgAdd width={20} height={20} />
    </Button>
  );
}
