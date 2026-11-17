import { useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';
import type { CSSProperties } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { spacing } from '@actual-app/components/tokens';
import { View } from '@actual-app/components/view';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
  ModalTitle,
} from '#components/common/Modal';
import type { Modal as ModalType } from '#modals/modalsSlice';

const SHEET_MAX_HEIGHT =
  'min(660px, calc(var(--visual-viewport-height) * 0.9))';

const titleStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: theme.pageTextDark,
  textAlign: 'center',
};

type MobileSheetChildArgs = {
  close: () => void;
  editTitle: () => void;
  isEditingTitle: boolean;
};

type MobileSheetProps = {
  name: ModalType['name'];
  title: string;
  onTitleUpdate?: (newTitle: string) => string | undefined;
  isLoading?: boolean;
  wrapperStyle?: CSSProperties;
  onClose?: () => void;
  children: ReactNode | ((args: MobileSheetChildArgs) => ReactNode);
};

export function MobileSheet({
  name,
  title,
  onTitleUpdate,
  isLoading,
  wrapperStyle,
  onClose,
  children,
}: MobileSheetProps) {
  const { t } = useTranslation();
  const { isNarrowWidth } = useResponsive();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const ignoreBlurRef = useRef(false);
  const titleId = useId();

  const editTitle = () => {
    ignoreBlurRef.current = false;
    setTitleError(null);
    setIsEditingTitle(true);
  };

  const stopEditing = () => {
    ignoreBlurRef.current = true;
    setTitleError(null);
    setIsEditingTitle(false);
  };

  const commitTitle = (newTitle: string, isBlur: boolean) => {
    if (ignoreBlurRef.current) {
      return;
    }
    const trimmed = newTitle.trim();
    if (!trimmed || trimmed === title) {
      stopEditing();
      return;
    }
    const error = onTitleUpdate?.(trimmed);
    if (error && !isBlur) {
      setTitleError(error);
      return;
    }
    stopEditing();
  };

  const onTitleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      event.preventDefault();
      stopEditing();
    }
  };

  const renderChildren = (close: () => void) =>
    typeof children === 'function'
      ? children({ close, editTitle, isEditingTitle })
      : children;

  if (!isNarrowWidth) {
    return (
      <Modal name={name} isLoading={isLoading} onClose={onClose}>
        {({ state }) => (
          <>
            <ModalHeader
              title={<ModalTitle title={title} shrinkOnOverflow />}
              rightContent={<ModalCloseButton onPress={() => state.close()} />}
            />
            {renderChildren(() => state.close())}
          </>
        )}
      </Modal>
    );
  }

  return (
    <Modal
      name={name}
      ariaLabelledBy={titleId}
      presentation="sheet"
      isLoading={isLoading}
      onClose={onClose}
      wrapperProps={{ style: wrapperStyle }}
      containerProps={{
        style: {
          padding: 0,
          paddingBottom: 'env(safe-area-inset-bottom)',
          maxHeight: SHEET_MAX_HEIGHT,
        },
      }}
    >
      {({ state }) => (
        <>
          <View
            style={{
              alignItems: 'center',
              padding: `${spacing.xs}px ${spacing.lg}px ${spacing.sm}px`,
              flexShrink: 0,
            }}
          >
            {isEditingTitle ? (
              <View style={{ width: '100%', alignItems: 'center' }}>
                <Input
                  id={titleId}
                  aria-label={t('Name')}
                  defaultValue={title}
                  autoFocus
                  onEnter={value => commitTitle(value, false)}
                  onBlur={event => commitTitle(event.currentTarget.value, true)}
                  onKeyDown={onTitleKeyDown}
                  style={{ ...titleStyle, width: '100%' }}
                />
                {titleError && (
                  <Text
                    style={{
                      ...styles.verySmallText,
                      color: theme.errorText,
                      textAlign: 'center',
                      marginTop: spacing.xs,
                    }}
                  >
                    {titleError}
                  </Text>
                )}
              </View>
            ) : (
              <h2
                id={titleId}
                style={{
                  ...titleStyle,
                  ...styles.lineClamp(2),
                  overflowWrap: 'anywhere',
                  maxWidth: '100%',
                  margin: 0,
                }}
              >
                {title}
              </h2>
            )}
          </View>
          <View style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {renderChildren(() => state.close())}
          </View>
        </>
      )}
    </Modal>
  );
}
