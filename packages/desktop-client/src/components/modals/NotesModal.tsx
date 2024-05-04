// @ts-strict-ignore
import React, { useEffect, useState } from 'react';

import { useNotes } from '../../hooks/useNotes';
import { SvgCheck } from '../../icons/v2';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { View } from '../common/View';
import { type CommonModalProps } from '../Modals';
import { Notes } from '../Notes';

type NotesModalProps = {
  modalProps: CommonModalProps;
  id: string;
  name: string;
  onSave: (id: string, notes: string) => void;
};

export function NotesModal({ modalProps, id, name, onSave }: NotesModalProps) {
  const originalNotes = useNotes(id);

  const [notes, setNotes] = useState(originalNotes);
  useEffect(() => setNotes(originalNotes), [originalNotes]);

  function _onClose() {
    modalProps?.onClose();
  }

  function _onSave() {
    if (notes !== originalNotes) {
      onSave?.(id, notes);
    }

    _onClose();
  }

  return (
    <Modal
      title={`Notes: ${name}`}
      showHeader
      focusAfterClose={false}
      {...modalProps}
      onClose={_onClose}
      style={{
        height: '50vh',
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'column',
        }}
      >
        <Notes
          notes={notes}
          editable={true}
          focused={true}
          getStyle={() => ({
            borderRadius: 6,
            flex: 1,
            minWidth: 0,
          })}
          onChange={setNotes}
        />
        <View
          style={{
            flexDirection: 'column',
            alignItems: 'center',
            justifyItems: 'center',
            width: '100%',
            paddingTop: 10,
          }}
        >
          <Button
            type="primary"
            style={{
              fontSize: 17,
              fontWeight: 400,
              width: '100%',
            }}
            onClick={_onSave}
          >
            <SvgCheck width={17} height={17} style={{ paddingRight: 5 }} />
            Save notes
          </Button>
        </View>
      </View>
    </Modal>
  );
}
