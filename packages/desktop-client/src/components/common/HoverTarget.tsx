import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { type CSSProperties } from 'glamor';

import View from './View';

type HoverTargetProps = {
  style?: CSSProperties;
  contentStyle?: CSSProperties;
  children: ReactNode;
  renderContent: () => ReactNode;
  disabled?: boolean;
};

export default function HoverTarget({
  style,
  contentStyle,
  children,
  renderContent,
  disabled,
}: HoverTargetProps) {
  let [hovered, setHovered] = useState(false);

  const onMouseEnter = useCallback(() => {
    if (!disabled) {
      setHovered(true);
    }
  }, [disabled]);

  const onMouseLeave = useCallback(() => {
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
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={contentStyle}
      >
        {children}
      </View>
      {hovered && renderContent()}
    </View>
  );
}
