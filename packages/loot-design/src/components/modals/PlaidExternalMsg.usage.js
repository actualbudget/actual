import React from 'react';

import PlaidExternalMsg from './PlaidExternalMsg';
import { Section, TestModal } from '../../guide/components';

export default () => (
  <Section>
    Plaid External Msg Modal
    <TestModal>
      {node => (
        <PlaidExternalMsg
          modalProps={{
            isCurrent: true,
            parent: node
          }}
        />
      )}
    </TestModal>
  </Section>
);
