// @ts-strict-ignore
import React, {
  useState,
  type ComponentType,
  type ComponentPropsWithoutRef,
  type FormEvent,
} from 'react';
import { Form } from 'react-aria-components';

import { styles } from '../../style';
import { Button } from '../common/Button2';
import { FormError } from '../common/FormError';
import { InitialFocus } from '../common/InitialFocus';
import { Modal, ModalCloseButton, type ModalHeader } from '../common/Modal2';
import { View } from '../common/View';
import { InputField } from '../mobile/MobileForms';
import { type CommonModalProps } from '../Modals';

type SingleInputModalProps = {
  modalProps: Partial<CommonModalProps>;
  Header: ComponentType<ComponentPropsWithoutRef<typeof ModalHeader>>;
  buttonText: string;
  onSubmit: (value: string) => void;
  onValidate?: (value: string) => string[];
  inputPlaceholder?: string;
};

export function SingleInputModal({
  modalProps,
  Header,
  buttonText,
  onSubmit,
  onValidate,
  inputPlaceholder,
}: SingleInputModalProps) {
  const [value, setValue] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  const _onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const error = onValidate?.(value);
    if (error) {
      setErrorMessage(error);
      return;
    }

    onSubmit?.(value);
    modalProps.onClose();
  };

  return (
    <Modal {...modalProps}>
      {({ close }) => (
        <>
          <Header rightContent={<ModalCloseButton onClick={close} />} />
          <Form onSubmit={_onSubmit}>
            <View>
              <InitialFocus>
                <InputField
                  placeholder={inputPlaceholder}
                  defaultValue={value}
                  onChangeValue={setValue}
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
                type="submit"
                variant="primary"
                style={{
                  height: styles.mobileMinHeight,
                  marginLeft: styles.mobileEditingPadding,
                  marginRight: styles.mobileEditingPadding,
                }}
              >
                {buttonText}
              </Button>
            </View>
          </Form>
        </>
      )}
    </Modal>
  );
}
