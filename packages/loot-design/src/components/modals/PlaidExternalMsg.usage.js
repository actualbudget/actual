import React from 'react';

import { Section, TestModal } from '../../guide/components';

import PlaidExternalMsg from './PlaidExternalMsg';

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
