import React, { ReactNode, useEffect, useRef, useState } from 'react';

import { Button } from '@actual-app/components/button';
import { SvgLogo } from '@actual-app/components/icons/logo';
import { SvgDelete } from '@actual-app/components/icons/v0';
import { Input } from '@actual-app/components/input';
import { CSSProperties, styles } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';

type ModalButtonsProps = {
  style?: CSSProperties;
  leftContent?: ReactNode;
  focusButton?: boolean;
  children: ReactNode;
};

export const ModalButtons = ({
  style,
  leftContent,
  focusButton = false,
  children,
}: ModalButtonsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusButton && containerRef.current) {
      const button = containerRef.current.querySelector<HTMLButtonElement>(
        'button:not([data-hidden])',
      );

      if (button) {
        button.focus();
      }
    }
  }, [focusButton]);

  return (
    <View
      innerRef={containerRef}
      style={{
        flexDirection: 'row',
        marginTop: 30,
        ...style,
      }}
    >
      {leftContent}
      <View style={{ flex: 1 }} />
      {children}
    </View>
  );
};

type ModalHeaderProps = {
  leftContent?: ReactNode;
  showLogo?: boolean;
  title?: ReactNode;
  rightContent?: ReactNode;
};

/**
 * Header used inside modals that centers an optional title and/or logo with
 * optional left and right content pinned to the edges.
 *
 * The center area shows either a logo (when `showLogo` is true), a title (string/number
 * rendered via ModalTitle), or a custom React node. `leftContent` and `rightContent`
 * are rendered in absolutely-positioned regions at the left and right edges respectively.
 *
 * @param leftContent - Content rendered at the left edge of the header (optional).
 * @param showLogo - When true, renders the app logo in the centered area.
 * @param title - Title to display in the center. If a string or number, it's rendered with ModalTitle; otherwise the node is rendered as-is.
 * @param rightContent - Content rendered at the right edge of the header (optional).
 * @returns A JSX element representing the modal header.
 */
export function ModalHeader({
  leftContent,
  showLogo,
  title,
  rightContent,
}: ModalHeaderProps) {
  return (
    <View
      role="heading"
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        height: 60,
        flex: 'none',
      }}
    >
      <View
        style={{
          position: 'absolute',
          left: 0,
        }}
      >
        {leftContent}
      </View>

      {(title || showLogo) && (
        <View
          style={{
            textAlign: 'center',
            // We need to force a width for the text-overflow
            // ellipses to work because we are aligning center.
            width: 'calc(100% - 60px)',
          }}
        >
          {showLogo && (
            <SvgLogo
              width={30}
              height={30}
              style={{ justifyContent: 'center', alignSelf: 'center' }}
            />
          )}
          {title &&
            (typeof title === 'string' || typeof title === 'number' ? (
              <ModalTitle title={`${title}`} />
            ) : (
              title
            ))}
        </View>
      )}

      {rightContent && (
        <View
          style={{
            position: 'absolute',
            right: 0,
          }}
        >
          {rightContent}
        </View>
      )}
    </View>
  );
}

type ModalTitleProps = {
  title: string;
  isEditable?: boolean;
  getStyle?: (isEditing: boolean) => CSSProperties;
  onEdit?: (isEditing: boolean) => void;
  onTitleUpdate?: (newName: string) => void;
};

/**
 * Displays a modal title that can be edited inline when enabled.
 *
 * Renders a centered, bold title. If `isEditable` is true, clicking the title switches it to an input field
 * so the user can edit the text. Pressing Enter or completing the input will call `onTitleUpdate` with the
 * new value only if it differs from the original, then exit edit mode. `getStyle` can supply additional
 * style overrides based on whether the title is currently being edited.
 *
 * @param title - The current title text to display.
 * @param isEditable - If true, the title becomes clickable and editable.
 * @param getStyle - Optional function that receives `isEditing` and returns CSS overrides merged into the title/input.
 * @param onTitleUpdate - Optional callback invoked with the new title when the user commits a change (only called if the value changed).
 * @returns A JSX element: an Input when editing, otherwise a centered span showing the title.
 */
export function ModalTitle({
  title,
  isEditable,
  getStyle,
  onTitleUpdate,
}: ModalTitleProps) {
  const [isEditing, setIsEditing] = useState(false);

  const onTitleClick = () => {
    if (isEditable) {
      setIsEditing(true);
    }
  };

  const _onTitleUpdate = (newTitle: string) => {
    if (newTitle !== title) {
      onTitleUpdate?.(newTitle);
    }
    setIsEditing(false);
  };

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isEditing) {
      if (inputRef.current) {
        inputRef.current.scrollLeft = 0;
      }
    }
  }, [isEditing]);

  const style = getStyle?.(isEditing);

  return isEditing ? (
    <Input
      ref={inputRef}
      style={{
        fontSize: 25,
        fontWeight: 700,
        textAlign: 'center',
        ...style,
      }}
      defaultValue={title}
      onUpdate={_onTitleUpdate}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          _onTitleUpdate?.(e.currentTarget.value);
        }
      }}
    />
  ) : (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <span
        onClick={onTitleClick}
        style={{
          fontSize: 25,
          fontWeight: 700,
          textAlign: 'center',
          ...(isEditable && styles.underlinedText),
          ...style,
        }}
      >
        {title}
      </span>
    </View>
  );
}

type ModalCloseButtonProps = {
  onPress?: () => void;
  style?: CSSProperties;
};

/**
 * A compact "close" button that renders a small delete icon inside a bare-styled Button.
 *
 * The `onPress` handler is forwarded to the Button. The `style` prop customizes the SVG icon's
 * appearance (it is applied to the `SvgDelete`), not the Button itself. The Button uses fixed
 * internal padding and the icon is rendered at a width of 10px.
 *
 * @param onPress - Optional callback invoked when the button is pressed.
 * @param style - Optional CSS properties applied to the delete icon SVG.
 * @returns A JSX element for use in modal headers or other compact UI areas.
 */
export function ModalCloseButton({ onPress, style }: ModalCloseButtonProps) {
  return (
    <Button variant="bare" onPress={onPress} style={{ padding: '10px 10px' }}>
      <SvgDelete width={10} style={style} />
    </Button>
  );
}
