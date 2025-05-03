import { Button } from '@actual-app/components/button';
import { type CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { css } from '@emotion/css';

import { type TransactionEntity } from 'loot-core/types/models';

import { InputCell } from '../../../table';
import {
  type TransactionEditFunction,
  type TransactionUpdateFunction,
} from '../utils';

type NotesCellProps = {
  id: TransactionEntity['id'];
  notes?: string | null | undefined;
  focusedField?: string;
  isPreview?: boolean;
  valueStyle?: CSSProperties | null;
  onNotesTagClick: (tag: string) => void;
  onEdit: TransactionEditFunction;
  onUpdate: TransactionUpdateFunction;
};

export function NotesCell({
  id,
  notes,
  focusedField,
  isPreview,
  valueStyle,
  onNotesTagClick,
  onEdit,
  onUpdate,
}: NotesCellProps) {
  return (
    <InputCell
      width="flex"
      name="notes"
      textAlign="flex"
      exposed={focusedField === 'notes'}
      focused={focusedField === 'notes'}
      value={notes || ''}
      valueStyle={valueStyle}
      formatter={value => notesTagFormatter(value, onNotesTagClick)}
      onExpose={name => !isPreview && onEdit(id, name)}
      inputProps={{
        value: notes || '',
        onUpdate: onUpdate.bind(null, 'notes'),
      }}
    />
  );
}

function notesTagFormatter(
  notes: string,
  onNotesTagClick: (tag: string) => void,
) {
  const words = notes.split(' ');
  return (
    <>
      {words.map((word, i, arr) => {
        const separator = arr.length - 1 === i ? '' : ' ';
        if (word.includes('#') && word.length > 1) {
          let lastEmptyTag = -1;
          // Treat tags in a single word as separate tags.
          // #tag1#tag2 => (#tag1)(#tag2)
          // not-a-tag#tag2#tag3 => not-a-tag(#tag2)(#tag3)
          return word.split('#').map((tag, ti) => {
            if (ti === 0) {
              return tag;
            }

            if (!tag) {
              lastEmptyTag = ti;
              return '#';
            }

            if (lastEmptyTag === ti - 1) {
              return `${tag} `;
            }
            lastEmptyTag = -1;

            const validTag = `#${tag}`;
            return (
              <span key={`${validTag}${ti}`}>
                <Button
                  variant="bare"
                  key={i}
                  className={css({
                    display: 'inline-flex',
                    padding: '3px 7px',
                    borderRadius: 16,
                    userSelect: 'none',
                    backgroundColor: theme.noteTagBackground,
                    color: theme.noteTagText,
                    cursor: 'pointer',
                    '&[data-hovered]': {
                      backgroundColor: theme.noteTagBackgroundHover,
                    },
                  })}
                  onPress={() => {
                    onNotesTagClick?.(validTag);
                  }}
                >
                  {validTag}
                </Button>
                {separator}
              </span>
            );
          });
        }
        return `${word}${separator}`;
      })}
    </>
  );
}
