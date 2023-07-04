import { type ChangeEvent, type Ref } from 'react';

import { colors } from '../../style';

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
        backgroundColor: isInModal ? null : colors.n11,
        ':focus': isInModal
          ? null
          : {
              backgroundColor: 'white',
              '::placeholder': { color: colors.n8 },
            },
      }}
    />
  );
}
