import { createContext, useContext } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Key } from 'react-aria-components';

type TreeItemEditingContextValue = {
  editingKey: Key | null;
  setEditingKey: Dispatch<SetStateAction<Key | null>>;
};

export const TreeItemEditingContext =
  createContext<TreeItemEditingContextValue | null>(null);

export function useTreeItemEditing(key: Key) {
  const context = useContext(TreeItemEditingContext);
  if (!context) {
    throw new Error(
      'useTreeItemEditing must be used within a TreeItemEditingContext',
    );
  }
  const { editingKey, setEditingKey } = context;

  const setIsEditing = (isEditing: boolean) =>
    setEditingKey(current => {
      if (isEditing) {
        return key;
      }
      return current === key ? null : current;
    });

  return [editingKey === key, setIsEditing] as const;
}
