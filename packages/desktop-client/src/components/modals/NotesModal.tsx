// @ts-strict-ignore
import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheck } from '@actual-app/components/icons/v2';
import { View } from '@actual-app/components/view';

import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { Notes } from '@desktop-client/components/Notes';
import { useNotes } from '@desktop-client/hooks/useNotes';
import { type Modal as ModalType } from '@desktop-client/modals/modalsSlice';

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
                <Trans>Save notes</Trans>
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
