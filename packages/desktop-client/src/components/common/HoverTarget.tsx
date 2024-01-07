import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { type CSSProperties } from '../../style';

import { View } from './View';

type HoverTargetProps = {
  style?: CSSProperties;
  contentStyle?: CSSProperties;
  children: ReactNode;
  renderContent: () => ReactNode;
  disabled?: boolean;
};

export function HoverTarget({
  style,
  contentStyle,
  children,
  renderContent,
  disabled,
}: HoverTargetProps) {
  const [hovered, setHovered] = useState(false);

  const onPointerEnter = useCallback(() => {
    if (!disabled) {
      setHovered(true);
    }
  }, [disabled]);

  const onPointerLeave = useCallback(() => {
    if (!disabled) {
      setHovered(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (disabled && hovered) {
      setHovered(false);
    }
  }, [disabled, hovered]);

  return (
    <View style={style}>
      <View
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        style={contentStyle}
      >
        {children}
      </View>
      {hovered && renderContent()}
    </View>
  );
}
