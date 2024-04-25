import React, { useRef, type ComponentProps, type ReactNode } from 'react';
import { Tooltip as AriaTooltip, TooltipTrigger } from 'react-aria-components';

import { useHover } from 'usehooks-ts';

import { styles } from '../../style';

import { View } from './View';

type TooltipProps = Partial<ComponentProps<typeof AriaTooltip>> & {
  children: ReactNode;
  content: ReactNode;
  triggerProps?: Partial<ComponentProps<typeof TooltipTrigger>>;
};

export const Tooltip = ({
  children,
  content,
  triggerProps = {},
  ...props
}: TooltipProps) => {
  const triggerRef = useRef(null);
  const isHovered = useHover(triggerRef);

  return (
    <View ref={triggerRef}>
      <TooltipTrigger
        isOpen={isHovered && !triggerProps.isDisabled}
        {...triggerProps}
      >
        {children}

        <AriaTooltip triggerRef={triggerRef} style={styles.tooltip} {...props}>
          {content}
        </AriaTooltip>
      </TooltipTrigger>
    </View>
  );
};
