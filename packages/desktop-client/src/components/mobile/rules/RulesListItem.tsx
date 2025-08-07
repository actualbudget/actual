import React from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { theme } from '@actual-app/components/theme';

import { type RuleEntity } from 'loot-core/types/models';

const ROW_HEIGHT = 60;

type RulesListItemProps = {
  rule: RuleEntity;
  onPress: () => void;
};

export function RulesListItem({ rule, onPress }: RulesListItemProps) {
  const { t } = useTranslation();

  const handlePress = () => {
    console.log('DEBUG: RulesListItem button pressed for rule:', rule.id);
    alert(`DEBUG: Rule ${rule.id} button pressed`);
    onPress();
  };

  return (
    <Button
      variant="bare"
      style={{
        minHeight: ROW_HEIGHT,
        width: '100%',
        borderRadius: 0,
        borderWidth: '0 0 1px 0',
        borderColor: theme.tableBorder,
        borderStyle: 'solid',
        backgroundColor: 'red', // Make it obvious for debugging
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 16px',
        gap: 12,
      }}
      onPress={handlePress}
    >
      <span style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
        CLICK ME - Rule {rule.id} - DEBUG TEST
      </span>
    </Button>
  );
}
