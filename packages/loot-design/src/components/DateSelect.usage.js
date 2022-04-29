import React from 'react';
import DateSelect from './DateSelect';
import { Section } from '../guide/components';

export default () => (
  <Section>
    Date Select
    <DateSelect
      onUpdate={() => {}}
      isOpen={true}
      dateFormat="MM/dd/yyyy"
      containerProps={{ style: { width: 300 } }}
    />
  </Section>
);
