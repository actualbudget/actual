// @ts-strict-ignore
import React, { type ComponentProps, useState } from 'react';

import { styles } from '../../style';
import { Button } from '../common/Button';
import { FormError } from '../common/FormError';
import { InitialFocus } from '../common/InitialFocus';
import { Modal } from '../common/Modal';
import { View } from '../common/View';
import { InputField } from '../mobile/MobileForms';
import { type CommonModalProps } from '../Modals';

type SingleInputModalProps = {
  modalProps: Partial<CommonModalProps>;
  title: ComponentProps<typeof Modal>['title'];
  buttonText: string;
  onSubmit: (value: string) => void;
  onValidate?: (value: string) => string[];
  inputPlaceholder?: string;
};

export function SingleInputModal({
  modalProps,
  title,
  buttonText,
  onSubmit,
  onValidate,
  inputPlaceholder,
}: SingleInputModalProps) {
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
    <Modal title={title} {...modalProps}>
      <View>
        <InitialFocus>
          <InputField
            placeholder={inputPlaceholder}
            defaultValue={value}
            onUpdate={setValue}
            onEnter={e => _onSubmit(e.currentTarget.value)}
          />
        </InitialFocus>
        {errorMessage && (
          <FormError
            style={{
              paddingTop: 5,
              marginLeft: styles.mobileEditingPadding,
              marginRight: styles.mobileEditingPadding,
            }}
          >
            * {errorMessage}
          </FormError>
        )}
      </View>
      <View
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: 10,
        }}
      >
        <Button
          type="primary"
          style={{
            height: styles.mobileMinHeight,
            marginLeft: styles.mobileEditingPadding,
            marginRight: styles.mobileEditingPadding,
          }}
          onClick={() => _onSubmit(value)}
        >
          {buttonText}
        </Button>
      </View>
    </Modal>
  );
}
