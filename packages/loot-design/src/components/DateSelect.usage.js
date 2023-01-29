import React from 'react';

import { Section } from '../guide/components';

import DateSelect from './DateSelect';

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
