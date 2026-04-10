import type { TransactionEntity } from 'loot-core/types/models';

import { InputCell } from '@desktop-client/components/table';

type NotesCellProps = {
  id: TransactionEntity['id'];
  notes: string | null | undefined;
  focused: boolean;
  exposed: boolean;
  isPreview?: boolean;
  onEdit: (id: TransactionEntity['id'], field: string) => void;
  onUpdate: (field: string, value: string) => void;
};

export function NotesCell({
  id,
  notes,
  focused,
  exposed,
  isPreview,
  onEdit,
  onUpdate,
}: NotesCellProps) {
  return (
    <InputCell
      name="notes"
      width="flex"
      focused={focused}
      exposed={exposed}
      onExpose={() => !isPreview && onEdit(id, 'notes')}
      value={notes || ''}
      style={{ marginLeft: -5 }}
      unexposedContent={({ value }) => (
        <div
          style={{
            flexGrow: 1,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            textOverflow: 'ellipsis',
          }}
        >
          {value}
        </div>
      )}
      inputProps={{
        value: notes || '',
        onUpdate: value => onUpdate('notes', value),
        placeholder: 'Notes',
      }}
    />
  );
}
