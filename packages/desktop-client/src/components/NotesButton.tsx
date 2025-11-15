import React, {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  useCallback,
} from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCustomNotesPaper } from '@actual-app/components/icons/v2';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

import { send } from 'loot-core/platform/client/fetch';

import { Notes } from './Notes';

import { useNotes } from '@desktop-client/hooks/useNotes';

type NotesButtonProps = {
  id: string;
  width?: number;
  height?: number;
  defaultColor?: string;
  tooltipPosition?: ComponentProps<typeof Tooltip>['placement'];
  showPlaceholder?: boolean;
  style?: CSSProperties;
};
export function NotesButton({
  id,
  width = 12,
  height = 12,
  defaultColor = theme.buttonNormalText,
  tooltipPosition = 'bottom start',
  showPlaceholder = false,
  style,
}: NotesButtonProps) {
  const { t } = useTranslation();
  const triggerRef = useRef(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const note = useNotes(id) || '';
  const hasNotes = note && note !== '';

  const [tempNotes, setTempNotes] = useState<string>(note);
  useEffect(() => setTempNotes(note), [note, id]);

  const onOpenChange = useCallback<
    NonNullable<ComponentProps<typeof Popover>['onOpenChange']>
  >(
    isOpen => {
      if (!isOpen) {
        if (tempNotes !== note) {
          void send('notes-save', { id, note: tempNotes });
        }
        setIsOpen(false);
      }
    },
    [id, note, tempNotes],
  );

  return (
    <Tooltip
      content={<Notes notes={note} />}
      placement={tooltipPosition}
      triggerProps={{
        isDisabled: !hasNotes || isOpen,
      }}
    >
      <View style={{ flexShrink: 0 }}>
        <Button
          ref={triggerRef}
          variant="bare"
          aria-label={t('View notes')}
          className={cx(
            css({
              color: defaultColor,
              ...style,
              padding: 4,
              ...(showPlaceholder && {
                opacity: hasNotes || isOpen ? 1 : 0.3,
              }),
              ...(isOpen && { color: theme.buttonNormalText }),
              '&:hover': { opacity: 1 },
            }),
            !hasNotes && !isOpen && !showPlaceholder ? 'hover-visible' : '',
          )}
          data-placeholder={showPlaceholder}
          onPress={() => {
            setIsOpen(true);
          }}
        >
          <SvgCustomNotesPaper style={{ width, height, flexShrink: 0 }} />
        </Button>
      </View>

      <Popover
        triggerRef={triggerRef}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
        placement={tooltipPosition}
        style={{ padding: 4 }}
      >
        <Notes notes={tempNotes} editable focused onChange={setTempNotes} />
      </Popover>
    </Tooltip>
  );
}
