// @ts-strict-ignore
import React, { useState } from 'react';

import { styles } from '../../style';
import { Button } from '../common/Button';
import { FormError } from '../common/FormError';
import { InitialFocus } from '../common/InitialFocus';
import { Input } from '../common/Input';
import { Modal } from '../common/Modal';
import { View } from '../common/View';
import { type CommonModalProps } from '../Modals';

type SingleInputProps = {
  modalProps: Partial<CommonModalProps>;
  title: string;
  buttonText: string;
  onSubmit: (value: string) => void;
  onValidate?: (value: string) => string[];
  inputPlaceholder?: string;
};

export function SingleInput({
  modalProps,
  title,
  buttonText,
  onSubmit,
  onValidate,
  inputPlaceholder,
}: SingleInputProps) {
  const [value, setValue] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  const _onSubmit = value => {
    const error = onValidate?.(value);
    if (error) {
      setErrorMessage(error);
      return;
    }

    onSubmit?.(value);
    modalProps.onClose();
  };
  return (
    <Modal
      title={title}
      {...modalProps}
      padding={0}
      style={{
        flex: 1,
        padding: '0 10px',
        paddingBottom: 10,
        borderRadius: '6px',
      }}
    >
      {() => (
        <>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <View style={{ flexDirection: 'column', flex: 1 }}>
              <InitialFocus>
                <Input
                  placeholder={inputPlaceholder}
                  style={{
                    height: styles.mobileMinHeight,
                    marginLeft: styles.mobileEditingPadding,
                    marginRight: styles.mobileEditingPadding,
                    ...styles.mediumText,
                  }}
                  value={value}
                  onChangeValue={setValue}
                  onEnter={e => _onSubmit(e.currentTarget.value)}
                />
              </InitialFocus>
              {errorMessage && (
                <FormError style={{ paddingTop: 5 }}>
                  * {errorMessage}
                </FormError>
              )}
            </View>
          </View>
          <View
            style={{
              alignContent: 'center',
              justifyContent: 'center',
              marginTop: 10,
            }}
          >
            <Button
              type="primary"
              style={{
                height: styles.mobileMinHeight,
                marginLeft: styles.mobileEditingPadding,
                marginRight: styles.mobileEditingPadding,
              }}
              onPointerUp={() => _onSubmit(value)}
            >
              {buttonText}
            </Button>
          </View>
        </>
      )}
    </Modal>
  );
}
