import React from 'react';
import RecurringSchedulePicker from './RecurringSchedulePicker';
import { Section } from '../guide/components';
import { Button, View } from './common';
import { useTooltip } from '../components/tooltips';

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
