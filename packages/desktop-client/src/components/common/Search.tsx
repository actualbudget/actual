import { type ChangeEvent, type Ref } from 'react';

import SvgRemove from '../../icons/v2/Remove';
import SearchAlternate from '../../icons/v2/SearchAlternate';
import { Button } from '../common';

import InputWithContent from './InputWithContent';

type SearchProps = {
  id: string;
  inputRef: Ref<HTMLInputElement>;
  value: string;
  onChange: (value: string) => unknown;
  placeholder: string;
  width?: number;
};

export default function Search({
  id,
  inputRef,
  value,
  onChange,
  placeholder,
  width = 350,
}: SearchProps) {
  return (
    <InputWithContent
      id={id}
      style={{ width: width }}
      leftContent={
        <SearchAlternate
          style={{
            width: 13,
            height: 13,
            flexShrink: 0,
            color: 'inherit',
            margin: 5,
            marginRight: 0,
          }}
        />
      }
      rightContent={
        <Button
          bare
          style={{ padding: 8 }}
          onClick={() => {
            value = '';
            onChange('');
          }}
          title="Clear search term"
        >
          <SvgRemove
            style={{
              width: 8,
              height: 8,
              color: 'inherit',
            }}
          />
        </Button>
      }
      inputRef={inputRef}
      value={value}
      placeholder={placeholder}
      onKeyDown={e => {
        if (e.key === 'Escape') onChange('');
      }}
      onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
    />
  );
}
