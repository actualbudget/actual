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
    
    // Try direct window navigation as a test
    console.log('DEBUG: Attempting window.location navigation');
    window.location.href = '/rules/edit';
    
    // Original navigation (comment out for now)
    /*
    navigate('/rules/edit', {
      state: {
        onRuleSaved: onRuleAdded,
      },
    });
    console.log('DEBUG: navigate called to /rules/edit');
    */
  }, [navigate, onRuleAdded]);

  return (
    <Button
      variant="bare"
      aria-label="Add new rule"
      style={{ 
        margin: 10, 
        backgroundColor: 'blue', 
        padding: 10, 
        borderRadius: 5 
      }}
      onPress={handleAddRule}
    >
      <span style={{ color: 'white', fontWeight: 'bold' }}>+ DEBUG</span>
    </Button>
  );
}
