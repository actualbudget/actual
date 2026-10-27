import React from 'react';
import type { ComponentPropsWithoutRef } from 'react';

import { Button } from './Button';
import { SvgClose } from './icons/v1';

type ChipProps = Omit<
  ComponentPropsWithoutRef<typeof Button>,
  'size' | 'variant'
> & {
  removable?: boolean;
  onRemove?: () => void;
  variant?: 'normal' | 'bare';
};

const chipStyle = {
  padding: '4px 8px',
  fontSize: 11,
  borderRadius: 3,
} as const;

export function Chip({
  removable = true,
  onRemove,
  variant = 'normal',
  style,
  children,
  ...props
}: ChipProps) {
  return (
    <Button
      {...props}
      variant={variant}
      style={renderProps => ({
        ...chipStyle,
        ...(typeof style === 'function' ? style(renderProps) : style),
      })}
    >
      {children}
      {onRemove != null && removable !== false && (
        <Button
          variant="bare"
          onPress={() => onRemove()}
          style={{ padding: 0, flexShrink: 0 }}
        >
          <SvgClose width={10} height={10} />
        </Button>
      )}
    </Button>
  );
}
