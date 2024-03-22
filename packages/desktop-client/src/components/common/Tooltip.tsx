import React, {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { Tooltip as AriaTooltip, TooltipTrigger } from 'react-aria-components';

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
  const [hover, setHover] = useState(false);

  // Force closing the tooltip whenever the disablement state changes
  useEffect(() => {
    setHover(false);
  }, [triggerProps.isDisabled]);

  return (
    <TooltipTrigger
      isOpen={hover && !triggerProps.isDisabled}
      delay={300}
      {...triggerProps}
    >
      <View
        ref={triggerRef}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {children}
      </View>

      <AriaTooltip triggerRef={triggerRef} style={styles.tooltip} {...props}>
        {content}
      </AriaTooltip>
    </TooltipTrigger>
  );
};
