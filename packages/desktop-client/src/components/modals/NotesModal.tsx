// @ts-strict-ignore
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { type Modal as ModalType } from 'loot-core/client/modals/modalsSlice';

import { useNotes } from '../../hooks/useNotes';
import { SvgCheck } from '../../icons/v2';
import { Button } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { View } from '../common/View';
import { Notes } from '../Notes';

type NotesModalProps = Extract<ModalType, { name: 'notes' }>['options'];

export function NotesModal({ id, name, onSave }: NotesModalProps) {
  const { t } = useTranslation();
  const originalNotes = useNotes(id);

  const [notes, setNotes] = useState(originalNotes);
  useEffect(() => setNotes(originalNotes), [originalNotes]);

  function _onSave() {
    if (notes !== originalNotes) {
      onSave?.(id, notes);
    }
  }

  return (
    <Modal
      name="notes"
      containerProps={{
        style: { height: '50vh' },
      }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Notes: {{name}}', { name })}
            rightContent={<ModalCloseButton onPress={close} />}
          />
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
                variant="primary"
                style={{
                  fontSize: 17,
                  fontWeight: 400,
                  width: '100%',
                }}
                onPress={() => {
                  _onSave();
                  close();
                }}
              >
                <SvgCheck width={17} height={17} style={{ paddingRight: 5 }} />
                {t('Save notes')}
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
