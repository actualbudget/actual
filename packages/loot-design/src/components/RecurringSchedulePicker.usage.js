import React from 'react';

import { Button, View } from './common';
import RecurringSchedulePicker from './RecurringSchedulePicker';
import { useTooltip } from './tooltips';
import { Section } from '../guide/components';

export default () => {
  const { isOpen, close, getOpenEvents } = useTooltip();
  const onChange = config => {};
  return (
    <Section direction="horizontal">
      Default
      <View>
        <Button {...getOpenEvents()}>
          {isOpen ? 'Hide' : 'Show'} Recurring Schedule Picker
        </Button>
        {isOpen && (
          <RecurringSchedulePicker
            closeTooltip={close}
            onSave={console.log}
            onChange={onChange}
          />
        )}
      </View>
    </Section>
  );
};
