import React, {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { Tooltip as AriaTooltip, TooltipTrigger } from 'react-aria-components';

import { useDebounceCallback } from 'usehooks-ts';

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
  const debouncedSetHover = useDebounceCallback(
    setHover,
    triggerProps.delay ?? 300,
  );

  // Force closing the tooltip whenever the disablement state changes
  useEffect(() => {
    setHover(false);
  }, [triggerProps.isDisabled]);

  return (
    <View
      ref={triggerRef}
      onMouseEnter={() => debouncedSetHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <TooltipTrigger
        isOpen={hover && !triggerProps.isDisabled}
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
