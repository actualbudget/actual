import React, { useState } from 'react';

import { type CommonModalProps } from '../../types/modals';
import Button from '../common/Button';
import FormError from '../common/FormError';
import InitialFocus from '../common/InitialFocus';
import Input from '../common/Input';
import Modal from '../common/Modal';
import View from '../common/View';

type SingleInputProps = {
  modalProps: Partial<CommonModalProps>;
  title: string;
  buttonText: string;
  onSubmit: (value: string) => void;
  onValidate?: (value: string) => string[];
  inputPlaceholder?: string;
};

function SingleInput({
  modalProps,
  title,
  buttonText,
  onSubmit,
  onValidate,
  inputPlaceholder,
}: SingleInputProps) {
  const [value, setValue] = useState('');
  const [errorMessages, setErrorMessages] = useState([]);

  const _onSubmit = value => {
    const errors = onValidate?.(value);
    if (errors?.length > 0) {
      setErrorMessages(errors);
      return;
    }

    onSubmit?.(value);
    modalProps.onClose();
  };
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
            <View style={{ flexDirection: 'column', flex: 1 }}>
              <InitialFocus>
                <Input
                  placeholder={inputPlaceholder}
                  onUpdate={setValue}
                  onEnter={e => _onSubmit(e.currentTarget.value)}
                />
              </InitialFocus>
              {errorMessages?.map((errorMessage, i) => (
                <FormError key={i} style={{ paddingTop: 5 }}>
                  * {errorMessage}
                </FormError>
              ))}
            </View>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              paddingBottom: 15,
            }}
          >
            <Button onPointerUp={e => _onSubmit(value)}>{buttonText}</Button>
          </View>
        </>
      )}
    </Modal>
  );
}

export default SingleInput;
