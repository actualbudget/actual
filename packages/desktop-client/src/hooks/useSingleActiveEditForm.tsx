import React, {
  type ReactNode,
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from 'react';

import usePrevious from './usePrevious';
import useStableCallback from './useStableCallback';

type ActiveEditCleanup = () => void;
type ActiveEditAction = () => void | ActiveEditCleanup;

type SingleActiveEditFormContextValue = {
  formName: string;
  editingField: string;
  onRequestActiveEdit: (
    field: string,
    action?: ActiveEditAction,
    clearActiveEditDelayMs?: number,
  ) => void;
  onClearActiveEdit: (delayMs?: number) => void;
};

const SingleActiveEditFormContext = createContext<
  SingleActiveEditFormContextValue | undefined
>(undefined);

type SingleActiveEditFormProviderProps = {
  formName: string;
  children: ReactNode;
};

export function SingleActiveEditFormProvider({
  formName,
  children,
}: SingleActiveEditFormProviderProps) {
  const [editingField, setEditingField] = useState(null);
  const prevEditingField = usePrevious(editingField);
  const actionRef = useRef<ActiveEditAction>(null);
  const cleanupRef = useRef<ActiveEditCleanup | void>(null);

  useEffect(() => {
    if (prevEditingField != null && prevEditingField !== editingField) {
      runCleanup();
    } else if (prevEditingField == null && editingField !== null) {
      runAction();
    }
  }, [editingField]);

  const runAction = () => {
    cleanupRef.current = actionRef.current?.();
  };

  const runCleanup = () => {
    const editCleanup = cleanupRef.current;
    if (typeof editCleanup === 'function') {
      editCleanup?.();
    }
    cleanupRef.current = null;
  };

  const onClearActiveEdit = (delayMs?: number) => {
    setTimeout(() => setEditingField(null), delayMs);
  };

  const onRequestActiveEdit = useStableCallback(
    (
      field: string,
      action: ActiveEditAction,
      options: {
        clearActiveEditDelayMs?: number;
      },
    ) => {
      if (editingField === field) {
        // Already active.
        return;
      }

      if (editingField) {
        onClearActiveEdit(options?.clearActiveEditDelayMs);
      } else {
        actionRef.current = action;
        setEditingField(field);
      }
    },
  );

  return (
    <SingleActiveEditFormContext.Provider
      value={{
        formName,
        editingField,
        onRequestActiveEdit,
        onClearActiveEdit,
      }}
    >
      {children}
    </SingleActiveEditFormContext.Provider>
  );
}

type UseSingleActiveEditFormResult = {
  formName: SingleActiveEditFormContextValue['formName'];
  editingField?: SingleActiveEditFormContextValue['editingField'];
  onRequestActiveEdit: SingleActiveEditFormContextValue['onRequestActiveEdit'];
  onClearActiveEdit: SingleActiveEditFormContextValue['onClearActiveEdit'];
};

export function useSingleActiveEditForm(): UseSingleActiveEditFormResult | null {
  const context = useContext(SingleActiveEditFormContext);

  if (!context) {
    return null;
  }

  return {
    formName: context.formName,
    editingField: context.editingField,
    onRequestActiveEdit: context.onRequestActiveEdit,
    onClearActiveEdit: context.onClearActiveEdit,
  };
}
