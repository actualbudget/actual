import React, { useMemo } from 'react';
import { components as SelectComponents } from 'react-select';

import Split from '../../icons/v0/Split';
import { colors } from '../../style';
import { View } from '../common';

import Autocomplete from './NewAutocomplete';

const SPLIT_TRANSACTION_KEY = 'split';

export default function CategoryAutocomplete({
  value,
  categoryGroups,
  showSplitOption = false,
  multi = false,
  onSplit,
  ...props
}) {
  const options = useMemo(() => {
    const suggestions = categoryGroups.map(group => ({
      label: group.name,
      options: group.categories.map(categ => ({
        value: categ.id,
        label: categ.name,
      })),
    }));

    if (showSplitOption) {
      suggestions.unshift({
        value: SPLIT_TRANSACTION_KEY,
        label: SPLIT_TRANSACTION_KEY,
      });
    }

    return suggestions;
  }, [categoryGroups, showSplitOption]);

  const allOptions = useMemo(
    () =>
      options.reduce(
        (carry, { options }) => [...carry, ...(options || [])],
        [],
      ),
    [options],
  );

  return (
    <Autocomplete
      options={options}
      value={
        multi
          ? allOptions.filter(item => value.includes(item.value))
          : allOptions.find(item => item.value === value)
      }
      isMulti={multi}
      components={{
        Option,
      }}
      {...props}
    />
  );
}

function Option(props) {
  if (props.value === SPLIT_TRANSACTION_KEY) {
    return (
      <SelectComponents.Option {...props}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            fontSize: 11,
            color: colors.g8,
            marginLeft: -12,
            padding: '4px 0',
          }}
          data-testid="split-transaction-button"
        >
          <Split
            width={10}
            height={10}
            style={{ marginRight: 5, color: 'inherit' }}
          />
          Split Transaction
        </View>
      </SelectComponents.Option>
    );
  }
  return <SelectComponents.Option {...props} />;
}
