import React from 'react';
import { useSelector } from 'react-redux';

import { useReports } from 'loot-core/client/data-hooks/reports';
import { getMonthYearFormat } from 'loot-core/src/shared/months';

import { useCategories } from '../../hooks/useCategories';
import { useDateFormat } from '../../hooks/useDateFormat';
import { AccountAutocomplete } from '../autocomplete/AccountAutocomplete';
import { Autocomplete } from '../autocomplete/Autocomplete';
import { CategoryAutocomplete } from '../autocomplete/CategoryAutocomplete';
import { FilterAutocomplete } from '../autocomplete/FilterAutocomplete';
import { PayeeAutocomplete } from '../autocomplete/PayeeAutocomplete';
import { ReportAutocomplete } from '../autocomplete/ReportAutocomplete';
import { Input } from '../common/Input';
import { View } from '../common/View';
import { Checkbox } from '../forms';
import { DateSelect } from '../select/DateSelect';
import { RecurringSchedulePicker } from '../select/RecurringSchedulePicker';

export function GenericInput({
  field,
  subfield,
  type,
  multi,
  value,
  inputRef,
  style,
  onChange,
}) {
  const { grouped: categoryGroups } = useCategories();
  const savedReports = useReports();
  const saved = useSelector(state => state.queries.saved);
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  // This makes the UI more resilient in case of faulty data
  if (multi && !Array.isArray(value)) {
    value = [];
  } else if (!multi && Array.isArray(value)) {
    return null;
  }

  const showPlaceholder = multi ? value.length === 0 : true;
  const autocompleteType = multi ? 'multi' : 'single';

  let content;
  switch (type) {
    case 'id':
      switch (field) {
        case 'payee':
          content = (
            <PayeeAutocomplete
              type={autocompleteType}
              showMakeTransfer={false}
              openOnFocus={true}
              value={value}
              onSelect={onChange}
              inputProps={{
                inputRef,
                ...(showPlaceholder ? { placeholder: 'nothing' } : null),
              }}
            />
          );
          break;

        case 'account':
          content = (
            <AccountAutocomplete
              type={autocompleteType}
              value={value}
              openOnFocus={true}
              onSelect={onChange}
              inputProps={{
                inputRef,
                ...(showPlaceholder ? { placeholder: 'nothing' } : null),
              }}
            />
          );
          break;

        case 'category':
          content = (
            <CategoryAutocomplete
              type={autocompleteType}
              categoryGroups={categoryGroups}
              value={value}
              openOnFocus={true}
              onSelect={onChange}
              showHiddenCategories={false}
              inputProps={{
                inputRef,
                ...(showPlaceholder ? { placeholder: 'nothing' } : null),
              }}
            />
          );
          break;

        default:
      }
      break;

    case 'saved':
      switch (field) {
        case 'saved':
          content = (
            <FilterAutocomplete
              type={autocompleteType}
              saved={saved}
              value={value}
              openOnFocus={true}
              onSelect={onChange}
              inputProps={{
                inputRef,
                ...(showPlaceholder ? { placeholder: 'nothing' } : null),
              }}
            />
          );
          break;
        case 'report':
          content = (
            <ReportAutocomplete
              type={autocompleteType}
              saved={savedReports}
              value={value}
              openOnFocus={true}
              onSelect={onChange}
              inputProps={{
                inputRef,
                ...(showPlaceholder ? { placeholder: 'nothing' } : null),
              }}
            />
          );
          break;

        default:
      }
      break;

    case 'date':
      switch (subfield) {
        case 'month':
          content = (
            <Input
              inputRef={inputRef}
              defaultValue={value || ''}
              placeholder={getMonthYearFormat(dateFormat).toLowerCase()}
              onEnter={e => onChange(e.target.value)}
              onBlur={e => onChange(e.target.value)}
            />
          );
          break;

        case 'year':
          content = (
            <Input
              inputRef={inputRef}
              defaultValue={value || ''}
              placeholder="yyyy"
              onEnter={e => onChange(e.target.value)}
              onBlur={e => onChange(e.target.value)}
            />
          );
          break;

        default:
          if (value && value.frequency) {
            content = (
              <RecurringSchedulePicker
                value={value}
                buttonStyle={{ justifyContent: 'flex-start' }}
                onChange={onChange}
              />
            );
          } else {
            content = (
              <DateSelect
                value={value}
                dateFormat={dateFormat}
                openOnFocus={false}
                inputRef={inputRef}
                inputProps={{ placeholder: dateFormat.toLowerCase() }}
                onSelect={onChange}
              />
            );
          }
          break;
      }
      break;

    case 'boolean':
      content = (
        <Checkbox
          checked={value}
          value={value}
          onChange={() => onChange(!value)}
        />
      );
      break;

    default:
      if (multi) {
        content = (
          <Autocomplete
            type={autocompleteType}
            suggestions={[]}
            value={value}
            inputProps={{ inputRef }}
            onSelect={onChange}
          />
        );
      } else {
        content = (
          <Input
            inputRef={inputRef}
            defaultValue={value || ''}
            placeholder="nothing"
            onEnter={e => onChange(e.target.value)}
            onBlur={e => onChange(e.target.value)}
          />
        );
      }
      break;
  }

  return <View style={{ flex: 1, ...style }}>{content}</View>;
}
