import { type ComponentProps } from 'react';
import { Popover as ReactAriaPopover } from 'react-aria-components';

import { css } from 'glamor';

import { styles } from '../../style';

type PopoverProps = ComponentProps<typeof ReactAriaPopover>;

export const Popover = ({
  style = {},
  shouldCloseOnInteractOutside,
  ...props
}: PopoverProps) => {
  return (
    <ReactAriaPopover
      placement="bottom end"
      offset={0}
      className={`${css({
        ...styles.tooltip,
        ...styles.lightScrollbar,
        padding: 0,
        ...style,
      })}`}
      shouldCloseOnInteractOutside={element => {
        // Disable closing the popover when a reach listbox is clicked (Select component)
        if (
          element.getAttribute('data-reach-listbox-list') !== null ||
          element.getAttribute('data-reach-listbox-option') !== null
        ) {
          return false;
        }

        if (shouldCloseOnInteractOutside) {
          return shouldCloseOnInteractOutside(element);
        }

        return true;
      }}
      {...props}
    />
  );
};
