import React, { useState } from 'react';
import Select from 'react-select';

import CreatableSelect from 'react-select/creatable';

import { NullComponent } from '../common';

import styles from './autocomplete-styles';

const Autocomplete = React.forwardRef(
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

    const filterOption = (option, input) => {
      return (
        option.data?.__isNew__ ||
        option.label.toLowerCase().includes(input?.toLowerCase())
      );
    };

    const onChange = async selected => {
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

    const onKeyDown = event => {
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
        embedded={embedded}
        menuPlacement="auto"
        menuPortalTarget={embedded ? undefined : document.body}
        {...props}
      />
    );
  },
);

export default Autocomplete;
