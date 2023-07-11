import React from 'react';

import { Tooltip } from '../common';

export default function MenuTooltip({ width, onClose, children }) {
  return (
    <Tooltip
      position="bottom-right"
      width={width}
      style={{ padding: 0 }}
      onClose={onClose}
    >
      {children}
    </Tooltip>
  );
}
