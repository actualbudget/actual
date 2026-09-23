import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import type { TooltipRenderProps } from 'react-joyride';

import { Button } from '@actual-app/components/button';
import type { CSSProperties } from '@actual-app/components/styles';

type TourTooltipButtonProps = {
  handleProps: TooltipRenderProps['primaryProps'];
  variant?: 'bare' | 'primary';
  style?: CSSProperties;
  children?: ReactNode;
};

export function TourTooltipButton({
  handleProps,
  variant = 'bare',
  style,
  children,
}: TourTooltipButtonProps) {
  const { onClick, title, ...restProps } = handleProps;

  return (
    <Button
      variant={variant}
      {...restProps}
      onClick={event => onClick(event as ReactMouseEvent<HTMLElement>)}
      style={style}
    >
      {children ?? title}
    </Button>
  );
}
