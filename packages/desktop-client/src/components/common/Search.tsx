import { type ChangeEvent, type Ref } from 'react';

import { colorsm } from '../../style';

import Input from './Input';

type SearchProps = {
  inputRef: Ref<HTMLInputElement>;
  value: string;
  onChange: (value: string) => unknown;
  placeholder: string;
  isInModal: boolean;
  width?: number;
};

export default function Search({
  inputRef,
  value,
  onChange,
  placeholder,
  isInModal,
  width = 350,
}: SearchProps) {
  return (
    <Input
      inputRef={inputRef}
      placeholder={placeholder}
      value={value}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      style={{
        width,
        borderColor: isInModal ? null : 'transparent',
        color: isInModal ? 'inherit' : colorsm.formInputTextHighlight,
        backgroundColor: isInModal ? null : colorsm.formInputBackground,
        ':focus': isInModal
          ? null
          : {
              color: colorsm.formInputText,
              backgroundColor: colorsm.formInputBackground,
              '::placeholder': { color: colorsm.formInputTextPlaceholder },
            },
      }}
    />
  );
}
