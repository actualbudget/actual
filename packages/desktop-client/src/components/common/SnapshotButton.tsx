import React, { type ReactNode, type CSSProperties } from 'react';

import { styles, theme } from '../../style';

import { Button } from './Button2';
import { Text } from './Text';
import { Tooltip } from './Tooltip';

type SnapshotButtonProps = {
  selected?: boolean;
  children: ReactNode;
  style?: CSSProperties;
  onSelect?: () => void;
  title?: string;
};

export function SnapshotButton({
  selected,
  children,
  style,
  onSelect,
  title,
}: SnapshotButtonProps) {
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
        aria-label={title}
      >
        {children}
      </Button>
    </Tooltip>
  );
}
