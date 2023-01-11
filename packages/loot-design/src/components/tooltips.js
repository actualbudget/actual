import React, { useState } from 'react';
import ReactDOM from 'react-dom';

import { css, before } from 'glamor';

import { styles } from '../style';

export const IntersectionBoundary = React.createContext();

export function useTooltip() {
  let [isOpen, setIsOpen] = useState(false);

  return {
    getOpenEvents: (events = {}) => ({
      onClick: e => {
        e.stopPropagation();
        events.onClick && events.onClick(e);
        setIsOpen(true);
      }
    }),
    isOpen,
    close: () => setIsOpen(false)
  };
}

export class Tooltip extends React.Component {
  static contextType = IntersectionBoundary;
  state = { position: null };

  constructor(props) {
    super(props);
    this.position = props.position || 'bottom-right';
    this.contentRef = React.createRef();
  }

  setup() {
    this.layout();

    let mousedownHandler = e => {
      let node = e.target;

      while (node && node !== document.documentElement) {
        // Allow clicking reach popover that mount outside of
        // tooltips. Might need to think about this more, like what
        // kind of things can be click that shouldn't close a tooltip?
        if (
          node.dataset.testid === 'tooltip' ||
          node.dataset.reachPopover != null
        ) {
          break;
        }

        node = node.parentNode;
      }

      if (node === document.documentElement) {
        this.props.onClose && this.props.onClose();
      }
    };

    let escHandler = e => {
      if (e.keyCode === 27) {
        this.props.onClose && this.props.onClose();
      }
    };

    window.document.addEventListener('mousedown', mousedownHandler, false);
    this.contentRef.current.addEventListener('keydown', escHandler, false);

    this.cleanup = () => {
      window.document.removeEventListener('mousedown', mousedownHandler);
    };
  }

  componentDidMount() {
    if (this.getContainer()) {
      this.setup();
    } else {
      // TODO: write comment :)
      this.forceUpdate(() => {
        if (this.getContainer()) {
          this.setup();
        } else {
          console.log('Warning: could not mount tooltip, container missing');
        }
      });
    }
  }

  componentDidUpdate(prevProps) {
    // If providing the target rect manually, we can dynamically
    // update to it. We can't do this if we are reading directly from
    // the DOM since we don't know when it's updated.
    if (
      prevProps.targetRect !== this.props.targetRect ||
      prevProps.forceTop !== this.props.forceTop ||
      this.props.forceLayout
    ) {
      this.layout();
    }
  }

  getContainer() {
    let { ignoreBoundary = false } = this.props;

    if (!ignoreBoundary && this.context) {
      return this.context.current;
    }
    return document.body;
  }

  getBoundsContainer() {
    // If the container is a scrollable element, we want to do all the
    // bounds checking on the parent DOM element instead
    let container = this.getContainer();

    if (
      container.parentNode &&
      container.parentNode.style.overflow === 'auto'
    ) {
      return container.parentNode;
    }
    return container;
  }

  layout() {
    let { targetRect, offset = 0 } = this.props;
    let contentEl = this.contentRef.current;
    if (!contentEl) {
      return;
    }

    let box = contentEl.getBoundingClientRect();
    let anchorEl = this.target.parentNode;

    let anchorRect = targetRect || anchorEl.getBoundingClientRect();

    // Copy it so we can mutate it
    anchorRect = {
      top: anchorRect.top,
      left: anchorRect.left,
      width: anchorRect.width,
      height: anchorRect.height
    };

    let container = this.getBoundsContainer();
    if (!container) {
      return;
    }

    let containerRect = container.getBoundingClientRect();
    anchorRect.left -= containerRect.left;
    anchorRect.top -= containerRect.top;

    // This is a hack, but allow consumers to force a top position if
    // they already know it. This allows them to provide consistent
    // updates. We should generalize this and `targetRect`
    if (this.props.forceTop) {
      anchorRect.top = this.props.forceTop;
    } else {
      let boxHeight = box.height + offset;
      let testTop = anchorRect.top - boxHeight;
      let testBottom = anchorRect.top + anchorRect.height + boxHeight;

      if (
        // If it doesn't fit above it, switch it to below
        (this.position.indexOf('top') !== -1 && testTop < containerRect.top) ||
        // If it doesn't fit below it, switch it above only if it does
        // fit above it
        (this.position.indexOf('bottom') !== -1 &&
          testBottom > containerRect.height &&
          testTop > 0)
      ) {
        // Invert the position
        this.position = this.getOppositePosition(this.position);
      }

      anchorRect.top += container.scrollTop;
    }

    const style = this.getStyleForPosition(
      this.position,
      box,
      anchorRect,
      this.getContainer().getBoundingClientRect(),
      offset
    );

    contentEl.style.top = style.top;
    contentEl.style.bottom = style.bottom;
    contentEl.style.left = style.left;
    contentEl.style.right = style.right;
    contentEl.style.width = style.width;
  }

  componentWillUnmount() {
    if (this.cleanup) {
      this.cleanup();
    }
  }

  getOppositePosition(position) {
    switch (position) {
      case 'top':
      case 'top-left':
        return 'bottom';
      case 'top-right':
        return 'bottom-right';
      case 'bottom':
      case 'bottom-left':
        return 'top';
      case 'bottom-right':
        return 'top-right';
      case 'bottom-stretch':
        return 'top-stretch';
      case 'top-stretch':
        return 'bottom-stretch';
      case 'bottom-center':
        return 'top-center';
      case 'top-center':
        return 'bottom-center';
      case 'right':
        return 'right';
      default:
    }
  }

  getStyleForPosition(position, boxRect, anchorRect, containerRect, offset) {
    const style = {
      top: 'inherit',
      bottom: 'inherit',
      left: 'inherit',
      right: 'inherit'
    };

    if (
      position === 'top' ||
      position === 'top-right' ||
      position === 'top-left'
    ) {
      style.top = anchorRect.top - boxRect.height - offset + 'px';
      if (position === 'top-right') {
        style.left =
          anchorRect.left + (anchorRect.width - boxRect.width) + 'px';
      } else {
        style.left = anchorRect.left + 'px';
        // style.right = 0;
      }
    } else if (
      position === 'bottom' ||
      position === 'bottom-right' ||
      position === 'bottom-left'
    ) {
      style.top = anchorRect.top + anchorRect.height + offset + 'px';
      if (position === 'bottom-right') {
        style.left =
          anchorRect.left + (anchorRect.width - boxRect.width) + 'px';
      } else {
        style.left = anchorRect.left + 'px';
        // style.right = 0;
      }
    } else if (position === 'bottom-center') {
      style.top = anchorRect.top + anchorRect.height + offset + 'px';
      style.left =
        anchorRect.left - (boxRect.width - anchorRect.width) / 2 + 'px';
    } else if (position === 'top-center') {
      style.top = anchorRect.top - boxRect.height - offset + 'px';
      style.left =
        anchorRect.left - (boxRect.width - anchorRect.width) / 2 + 'px';
    } else if (position === 'left-center') {
      style.top =
        anchorRect.top - (boxRect.height - anchorRect.height) / 2 + 'px';
      style.left = anchorRect.left - boxRect.width + 'px';
    } else if (position === 'top-stretch') {
      style.bottom = containerRect.height - anchorRect.top + offset + 'px';
      style.left = anchorRect.left + 'px';
      style.width = anchorRect.width + 'px';
    } else if (position === 'bottom-stretch') {
      style.top = anchorRect.top + anchorRect.height + offset + 'px';
      style.left = anchorRect.left + 'px';
      style.width = anchorRect.width + 'px';
    } else if (position === 'right') {
      style.top = anchorRect.top + 'px';
      style.left = anchorRect.left + anchorRect.width + offset + 'px';
    } else {
      throw new Error('Invalid position for Tooltip: ' + position);
    }
    return style;
  }

  render() {
    const { children, width, style } = this.props;

    const contentStyle = {
      position: 'absolute',
      zIndex: 3000,

      padding: 5,
      width,
      ...styles.shadowLarge,
      borderRadius: 4,
      backgroundColor: 'white'
      // opacity: 0,
      // transition: 'transform .1s, opacity .1s',
      // transitionTimingFunction: 'ease-out'
    };

    // const enteredStyle = { opacity: 1, transform: 'none' };

    if (!this.getContainer()) {
      return null;
    }

    return (
      <div ref={el => (this.target = el)}>
        {ReactDOM.createPortal(
          <div
            {...css(contentStyle, style, styles.darkScrollbar)}
            ref={this.contentRef}
            data-testid="tooltip"
            onClick={e => {
              // Click events inside a tooltip (e.g. when selecting a menu item) will bubble up
              // through the portal to parents in the React tree (as opposed to DOM parents).
              // This is undesirable. For example, clicking on a category group on a budget sheet
              // toggles that group, and so would clicking on a menu item in the settings menu
              // of that category group if the click event wasn't stopped from bubbling up.
              // This issue could be handled in different ways, but I think stopping propagation
              // here is sane; I can't see a scenario where you would want to take advantage of
              // click propagation from a tooltip back to its React parent.
              e.stopPropagation();
            }}
          >
            {children}
          </div>,
          this.getContainer()
        )}
      </div>
    );
  }
}

export function Pointer({
  pointerDirection = 'up',
  pointerPosition = 'left',
  backgroundColor,
  borderColor = '#c0c0c0',
  border = true,
  color,
  style,
  innerStyle,
  pointerStyle,
  children
}) {
  return (
    <div {...css({ position: 'relative' }, style)}>
      <div
        {...css(
          {
            zIndex: 3000,
            backgroundColor: backgroundColor,
            color: color,
            padding: 10,
            boxShadow: '0 2px 6px rgba(0, 0, 0, .25)',
            border: border && '1px solid ' + borderColor,
            borderRadius: 2
          },
          before({
            position: 'absolute',
            display: 'inline-block',
            backgroundColor,
            border: border && '1px solid ' + borderColor,
            borderLeft: 0,
            borderBottom: 0,
            width: 7,
            height: 7,
            boxShadow: '1px -1px 1px rgba(0, 0, 0, .05)',
            ...(pointerDirection === 'up'
              ? {
                  transform: 'rotate(-45deg)',
                  top: border ? -4 : -3,
                  content: '" "',
                  ...(pointerPosition === 'center'
                    ? { left: 'calc(50% - 3.5px)' }
                    : pointerPosition === 'left'
                    ? { left: 40 }
                    : { right: 40 })
                }
              : pointerDirection === 'down'
              ? {
                  transform: 'rotate(135deg)',
                  bottom: border ? -4 : -3,
                  content: '" "',
                  ...(pointerPosition === 'center'
                    ? { left: 'calc(50% - 3.5px)' }
                    : pointerPosition === 'left'
                    ? { left: 40 }
                    : { right: 40 })
                }
              : pointerDirection === 'right'
              ? {
                  transform: 'rotate(45deg)',
                  content: '" "',
                  top: 'calc(50% - 3.5px)',
                  right: -3
                }
              : {}),
            ...pointerStyle
          }),
          innerStyle
        )}
      >
        {children}
      </div>
    </div>
  );
}
