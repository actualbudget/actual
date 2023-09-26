import React, { useState } from 'react';

import { type CommonModalProps } from '../../types/modals';
import Button from '../common/Button';
import InitialFocus from '../common/InitialFocus';
import Input from '../common/Input';
import Modal from '../common/Modal';
import View from '../common/View';

type SingleInputProps = {
  modalProps: Partial<CommonModalProps>;
  title: string;
  inputPlaceholder: string;
  buttonText: string;
  onSubmit: (value: string) => void;
};

function SingleInput({
  modalProps,
  title,
  inputPlaceholder,
  buttonText,
  onSubmit,
}: SingleInputProps) {
  const [value, setValue] = useState('');
  return (
    <Modal title={title} {...modalProps}>
      {() => (
        <>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              paddingBottom: 15,
            }}
          >
            <InitialFocus>
              <Input
                placeholder={inputPlaceholder}
                onUpdate={setValue}
                onEnter={e => {
                  onSubmit?.(e.currentTarget.value);
                  modalProps.onClose();
                }}
              />
            </InitialFocus>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              paddingBottom: 15,
            }}
          >
            <Button
              onPointerUp={e => {
                onSubmit?.(value);
                modalProps.onClose();
              }}
            >
              {buttonText}
            </Button>
          </View>
        </>
      )}
    </Modal>
  );
}

export default SingleInput;
