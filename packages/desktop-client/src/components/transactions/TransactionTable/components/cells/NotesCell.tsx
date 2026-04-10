import type { TransactionEntity } from 'loot-core/types/models';

import { Cell, InputCell } from '@desktop-client/components/table';
import { NotesTagFormatter } from '@desktop-client/notes/NotesTagFormatter';

type NotesCellProps = {
  id: TransactionEntity['id'];
  notes: string | null | undefined;
  focused: boolean;
  exposed: boolean;
  isPreview?: boolean;
  onEdit: (id: TransactionEntity['id'], field: string) => void;
  onUpdate: (field: string, value: string) => void;
  onNotesTagClick: (tag: string) => void;
};

export function NotesCell({
  id,
  notes,
  focused,
  exposed,
  isPreview,
  onEdit,
  onUpdate,
  onNotesTagClick,
}: NotesCellProps) {
  return (
    <Cell
      name="notes"
      width="flex"
      focused={focused}
      exposed={exposed}
      onExpose={() => onEdit(id, 'notes')}
      value={notes || ''}
      style={{ marginLeft: -5 }}
      unexposedContent={({ value }) => (
        <NotesTagFormatter notes={value} onTagClick={onNotesTagClick} />
      )}
    >
      {exposed && !isPreview && (
        <InputCell
          value={notes || ''}
          onUpdate={value => onUpdate('notes', value)}
          inputProps={{
            placeholder: 'Notes',
          }}
        />
      )}
    </Cell>
  );
}
