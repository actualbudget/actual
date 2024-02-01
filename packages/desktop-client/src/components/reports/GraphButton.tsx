// @ts-strict-ignore
import React, { type HTMLProps } from 'react';

import { type CSSProperties, theme } from '../../style';
import { Button } from '../common/Button';
import { HoverTarget } from '../common/HoverTarget';
import { Text } from '../common/Text';
import { Tooltip } from '../tooltips';

type GraphButtonProps = HTMLProps<HTMLButtonElement> & {
  selected?: boolean;
  style?: CSSProperties;
  onSelect?: (newValue) => void;
  title?: string;
  disabled?: boolean;
};

export const GraphButton = ({
  selected,
  children,
  onSelect,
  title,
  style,
  disabled,
}: GraphButtonProps) => {
  return (
    <HoverTarget
      style={{ flexShrink: 0 }}
      renderContent={() => (
        <Tooltip
          position="bottom-left"
          style={{
            lineHeight: 1.5,
            padding: '6px 10px',
            backgroundColor: theme.menuBackground,
            color: theme.menuItemText,
          }}
        >
          <Text>{title}</Text>
        </Tooltip>
      )}
    >
      <Button
        type="bare"
        style={{
          ...(selected && {
            backgroundColor: theme.buttonBareBackgroundHover,
          }),
          ...style,
        }}
        onClick={onSelect}
        disabled={disabled}
      >
        {children}
      </Button>
    </HoverTarget>
  );
};
