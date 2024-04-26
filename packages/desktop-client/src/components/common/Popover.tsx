import { type ComponentProps } from 'react';
import { Popover as ReactAriaPopover } from 'react-aria-components';

import { styles } from '../../style';

type PopoverProps = ComponentProps<typeof ReactAriaPopover>;

export const Popover = ({ style = {}, ...props }: PopoverProps) => {
  return (
    <ReactAriaPopover
      placement="bottom end"
      offset={0}
      style={{ ...styles.tooltip, padding: 0, ...style }}
      {...props}
    />
  );
};
