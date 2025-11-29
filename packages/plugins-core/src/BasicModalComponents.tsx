import React, {
  CSSProperties,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { SvgDelete } from '@actual-app/components/icons/v0';
import { View } from '@actual-app/components/view';
import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import { SvgLogo } from '@actual-app/components/icons/logo';
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

export function ModalCloseButton({ onPress, style }: ModalCloseButtonProps) {
  const { t } = useTranslation();
  return (
    <Button
      variant="bare"
      onPress={onPress}
      aria-label={t('Close')}
      style={{ padding: '10px 10px' }}
    >
      <SvgDelete width={10} style={style} />
    </Button>
  );
}
