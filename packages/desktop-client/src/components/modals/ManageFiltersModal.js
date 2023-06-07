import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { isNonProductionEnvironment } from 'loot-core/src/shared/environment';

import { Modal } from '../common';
import ManageFilters from '../ManageFilters';

export default function ManageFiltersModal({ modalProps, payeeId }) {
  let [loading, setLoading] = useState(true);
  let location = useLocation();
  if (isNonProductionEnvironment()) {
    if (location.pathname !== '/payees') {
      throw new Error(
        `Possibly invalid use of ManageFiltersModal, add the current url \`${location.pathname}\` to the allowlist if you’re confident the modal can never appear on top of the \`/filters\` page.`,
      );
    }
  }
  return (
    <Modal
      title="Filters"
      padding={0}
      loading={loading}
      {...modalProps}
      style={[modalProps.style, { flex: 1, maxWidth: '90%', maxHeight: '90%' }]}
    >
      {() => (
        <ManageFilters isModal payeeId={payeeId} setLoading={setLoading} />
      )}
    </Modal>
  );
}
