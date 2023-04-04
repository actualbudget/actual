import React, { useState } from 'react';
import Select, {
  GroupBase,
  Props as SelectProps,
  PropsValue,
  SingleValue,
  SelectInstance,
} from 'react-select';

import type { CreatableProps } from 'react-select/creatable';
import CreatableSelect from 'react-select/creatable';

import { NullComponent } from '../common';

import styles from './autocomplete-styles';

type OptionValue = {
  __isNew__?: boolean;
  label: string;
  value: true;
};

interface BaseAutocompleteProps {
  focused?: boolean;
  embedded?: boolean;
  onSelect: (value: PropsValue<OptionValue>) => void;
  onCreateOption?: (value: string) => void;
  isCreatable?: boolean;
}

type SimpleAutocompleteProps = BaseAutocompleteProps & SelectProps<OptionValue>;
type CreatableAutocompleteProps = BaseAutocompleteProps &
  CreatableProps<OptionValue, true, GroupBase<OptionValue>> & {
    isCreatable: true;
  };

type AutocompleteProps = SimpleAutocompleteProps | CreatableAutocompleteProps;

const isSingleValue = (
  value: PropsValue<OptionValue>,
): value is SingleValue<OptionValue> => {
  return !Array.isArray(value);
};

const Autocomplete = React.forwardRef<SelectInstance, AutocompleteProps>(
  (
    {
      value,
      options = [],
      focused = false,
      embedded = false,
      onSelect,
      onCreateOption,
      isCreatable = false,
      components = {},
      ...props
    },
    ref,
  ) => {
    const [initialValue] = useState(value);
    const [isOpen, setIsOpen] = useState(focused);

    const [inputValue, setInputValue] = useState<
      AutocompleteProps['inputValue']
    >(() => (isSingleValue(value) ? value?.label : undefined));
    const [isInitialInputValue, setInitialInputValue] = useState(true);

    const onInputChange: AutocompleteProps['onInputChange'] = value => {
      setInputValue(value);
      setInitialInputValue(false);
    };

    const filterOption: AutocompleteProps['filterOption'] = (option, input) => {
      if (isInitialInputValue) {
        return true;
      }

      return (
        option.data?.__isNew__ ||
        option.label.toLowerCase().includes(input?.toLowerCase())
      );
    };

    const onChange: AutocompleteProps['onChange'] = selected => {
      // Clear button clicked
      if (!selected) {
        onSelect(null);
        return;
      }

      // Create a new option
      if (selected.__isNew__) {
        onCreateOption(selected.value);
        return;
      }

      // Close the menu when making a successful selection
      if (!Array.isArray(selected)) {
        setIsOpen(false);
      }

      // Multi-select has multiple selections
      if (Array.isArray(selected)) {
        onSelect(selected.map(option => option.value));
        return;
      }

      onSelect(selected.value);
    };

    const onKeyDown: AutocompleteProps['onKeyDown'] = event => {
      if (event.code === 'Escape') {
        onSelect(initialValue);
        setIsOpen(false);
        return;
      }

      if (!isOpen) {
        setIsOpen(true);
      }
    };

    const Component = isCreatable ? CreatableSelect : Select;

    return (
      <Component
        ref={ref}
        value={value}
        menuIsOpen={isOpen || embedded}
        autoFocus={embedded}
        options={options}
        placeholder="(none)"
        captureMenuScroll={false}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onCreateOption={onCreateOption}
        onBlur={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        isClearable
        filterOption={filterOption}
        components={{
          IndicatorSeparator: NullComponent,
          DropdownIndicator: NullComponent,
          ...components,
        }}
        maxMenuHeight={200}
        styles={styles}
        data-embedded={embedded}
        menuPlacement="auto"
        menuPortalTarget={embedded ? undefined : document.body}
        inputValue={inputValue}
        onInputChange={onInputChange}
        {...props}
      />
    );
  },
);

export default Autocomplete;
