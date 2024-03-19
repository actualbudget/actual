import React, { type ReactNode } from 'react';

import { Tooltip } from '../tooltips';

type MenuTooltipProps = {
  width: number;
  onClose: () => void;
  children: ReactNode;
};

export function MenuTooltip({ width, onClose, children }: MenuTooltipProps) {
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
