import { useHotkeys } from 'react-hotkeys-hook';

import { SelectedItemsButton } from '#components/table';
import { useSelectedDispatch, useSelectedItems } from '#hooks/useSelected';
import {
  useDeleteTagsMutation,
  useHideTagsMutation,
  useUnhideTagsMutation,
} from '#tags';

type Actions = 'delete-tags' | 'hide-tags' | 'unhide-tags';

export function SelectedTagsButton() {
  const dispatch = useSelectedDispatch();
  const selectedItems = useSelectedItems();
  const { mutate: deleteTags } = useDeleteTagsMutation();
  const { mutate: hideTags } = useHideTagsMutation();
  const { mutate: unhideTags } = useUnhideTagsMutation();

  async function handleDelete(tagIds: string[]) {
    deleteTags(
      { ids: tagIds },
      { onSuccess: () => dispatch({ type: 'select-none' }) },
    );
  }

  function handleSelect(name: Actions, tagIds: string[]) {
    if (name === 'delete-tags') {
      handleDelete(tagIds);
    } else if (name === 'hide-tags') {
      hideTags({ ids: [...tagIds] });
    } else if (name === 'unhide-tags') {
      unhideTags({ ids: [...tagIds] });
    } else {
      console.error('Unhandled action', name);
    }
  }

  const enabled = !!selectedItems.size;
  useHotkeys('d', () => handleDelete([...selectedItems]), { enabled });
  useHotkeys('h', () => hideTags({ ids: [...selectedItems] }), { enabled });
  useHotkeys('u', () => unhideTags({ ids: [...selectedItems] }), { enabled });

  return (
    <SelectedItemsButton<Actions>
      id="selected-tags"
      name={c => `${c} Tags`}
      items={[
        { name: 'delete-tags', text: 'Delete', key: 'D' },
        { name: 'hide-tags', text: 'Hide', key: 'H' },
        { name: 'unhide-tags', text: 'Unhide', key: 'U' },
      ]}
      onSelect={handleSelect}
    />
  );
}
