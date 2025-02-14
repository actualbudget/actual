import React, { type HTMLProps, type CSSProperties } from 'react';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { Tooltip } from '@actual-app/components/tooltip';

import { styles, theme } from '../../style';

type GraphButtonProps = HTMLProps<HTMLButtonElement> & {
  selected?: boolean;
  style?: CSSProperties;
  onSelect?: () => void;
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
        aria-label={title}
      >
        {children}
      </Button>
    </Tooltip>
  );
};
