import React, { type HTMLProps } from 'react';

import { type CSSProperties, styles, theme } from '../../style';
import { Button } from '../common/Button2';
import { Text } from '../common/Text';
import { Tooltip } from '../common/Tooltip';

type GraphButtonProps = HTMLProps<HTMLButtonElement> & {
  selected?: boolean;
  style?: CSSProperties;
  onSelect?: (newValue: string) => void;
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
    <Tooltip
      placement="bottom start"
      content={<Text>{title}</Text>}
      style={{ ...styles.tooltip, lineHeight: 1.5, padding: '6px 10px' }}
    >
      <Button
        variant="bare"
        style={{
          ...(selected && {
            backgroundColor: theme.buttonBareBackgroundHover,
          }),
          ...style,
        }}
        onPress={onSelect}
        isDisabled={disabled}
      >
        {children}
      </Button>
    </Tooltip>
  );
};
