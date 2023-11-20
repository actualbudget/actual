import React, { forwardRef, type HTMLProps } from 'react';

import { type CSSProperties, theme } from '../../style';
import Button from '../common/Button';
import HoverTarget from '../common/HoverTarget';
import Text from '../common/Text';
import { Tooltip } from '../tooltips';

type GraphButtonProps = HTMLProps<HTMLButtonElement> & {
  selected?: boolean;
  style?: CSSProperties;
  onSelect;
  title?: string;
  disabled?: boolean;
};

const GraphButton = forwardRef<HTMLButtonElement, GraphButtonProps>(
  ({ selected, children, onSelect, title, style, disabled }) => {
    return (
      <HoverTarget
        style={{ flexShrink: 0 }}
        renderContent={() => (
          <Tooltip
            position="bottom-left"
            style={{
              lineHeight: 1.5,
              padding: '6px 10px',
              backgroundColor: theme.menuAutoCompleteBackground,
              color: theme.menuAutoCompleteText,
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
  },
);

export default GraphButton;
