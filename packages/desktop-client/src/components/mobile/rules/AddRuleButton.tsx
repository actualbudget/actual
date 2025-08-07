import React from 'react';
import { useNavigate } from 'react-router';

import { Button } from '@actual-app/components/button';
import { SvgAdd } from '@actual-app/components/icons/v1';

type AddRuleButtonProps = {
  onRuleAdded: () => void;
};

export function AddRuleButton({ onRuleAdded }: AddRuleButtonProps) {
  const navigate = useNavigate();

  const handleAddRule = () => {
    navigate('/rules/edit', {
      state: {
        onRuleSaved: onRuleAdded,
      },
    });
  };

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
