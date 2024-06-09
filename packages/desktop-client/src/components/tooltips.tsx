// @ts-strict-ignore
import {
  Component,
  createContext,
  createRef,
  type RefObject,
  type ReactNode,
  type ContextType,
} from 'react';
import ReactDOM from 'react-dom';

import { css } from 'glamor';

import { type CSSProperties, styles, theme } from '../style';

export const IntersectionBoundary = createContext<RefObject<HTMLElement>>(null);

type TooltipPosition =
  | 'top'
  | 'top-left'
  | 'top-right'
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right'
  | 'bottom-stretch'
  | 'top-stretch'
  | 'bottom-center'
  | 'top-center'
  | 'left-center'
  | 'right';

type TooltipProps = {
  position?: TooltipPosition;
  onClose?: () => void;
  forceLayout?: boolean;
  forceTop?: number;
  ignoreBoundary?: boolean;
  targetRect?: DOMRect;
  offset?: number;
  style?: CSSProperties;
  width?: number;
  children: ReactNode;
  targetHeight?: number;
};
type MutableDomRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

// @deprecated: please use `Tooltip` component in `common` folder
export class Tooltip extends Component<TooltipProps> {
  static contextType = IntersectionBoundary;
  position: TooltipPosition;
  contentRef: RefObject<HTMLDivElement>;
  cleanup: () => void;
  target: HTMLDivElement;
  context: ContextType<typeof IntersectionBoundary> = this.context; // assign type to context without using declare.

  constructor(props) {
    super(props);
    this.position = props.position || 'bottom-right';
    this.contentRef = createRef<HTMLDivElement>();
  }

  isHTMLElement(element: unknown): element is HTMLElement {
    return element instanceof HTMLElement;
  }

  setup() {
    this.layout();

    const pointerDownHandler = e => {
      let node = e.target;

      while (node && node !== document.documentElement) {
        // Allow clicking reach popover that mount outside of
        // tooltips. Might need to think about this more, like what
        // kind of things can be click that shouldn't close a tooltip?
        if (node.dataset.istooltip || node.dataset.reachPopover != null) {
          break;
        }

        node = node.parentNode;
      }

      if (node === document.documentElement) {
        this.props.onClose?.();
      }
    };

    const escHandler = e => {
      if (e.key === 'Escape') {
        this.props.onClose?.();
      }
    };

    window.document.addEventListener('pointerdown', pointerDownHandler, false);
    this.contentRef.current?.addEventListener('keydown', escHandler, false);

    this.cleanup = () => {
      window.document.removeEventListener(
        'pointerdown',
        pointerDownHandler,
        false,
      );
      this.contentRef.current?.removeEventListener(
        'keydown',
        escHandler,
        false,
      );
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

  getContainer(): HTMLElement {
    const { ignoreBoundary = false } = this.props;

    if (!ignoreBoundary && this.context) {
      return this.context.current;
    }
    return document.body;
  }

  getBoundsContainer() {
    // If the container is a scrollable element, we want to do all the
    // bounds checking on the parent DOM element instead
    const container = this.getContainer();

    if (
      container.parentNode &&
      this.isHTMLElement(container.parentNode) &&
      container.parentNode.style.overflow === 'auto'
    ) {
      return container.parentNode;
    }
    return container;
  }

  layout() {
    const { targetRect, offset = 0 } = this.props;
    const contentEl = this.contentRef.current;
    if (!contentEl) {
      return;
    }

    const box = contentEl.getBoundingClientRect();

    const anchorEl = this.target.parentNode;

    let anchorRect: MutableDomRect | undefined =
      targetRect ||
      (this.isHTMLElement(anchorEl)
        ? anchorEl?.getBoundingClientRect()
        : undefined);

    if (!anchorRect) {
      return;
    }

    // Copy it so we can mutate it
    anchorRect = {
      top: anchorRect.top,
      left: anchorRect.left,
      width: anchorRect.width,
      height: anchorRect.height,
    };

    const container = this.getBoundsContainer();
    if (!container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    anchorRect.left -= containerRect.left;
    anchorRect.top -= containerRect.top;

    // This is a hack, but allow consumers to force a top position if
    // they already know it. This allows them to provide consistent
    // updates. We should generalize this and `targetRect`
    if (this.props.forceTop) {
      anchorRect.top = this.props.forceTop;
    } else {
      const boxHeight = box.height + offset;
      const testTop = anchorRect.top - boxHeight;
      const testBottom = anchorRect.top + anchorRect.height + boxHeight;

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
      offset,
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
      right: 'inherit',
      width: undefined as string | undefined,
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
      backgroundColor: theme.menuBackground,
      color: theme.menuItemText,
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
            className={`${css(contentStyle, style, styles.darkScrollbar)}`}
            ref={this.contentRef}
            data-testid={this.props['data-testid'] || 'tooltip'}
            data-istooltip
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
          this.getContainer(),
        )}
      </div>
    );
  }
}
