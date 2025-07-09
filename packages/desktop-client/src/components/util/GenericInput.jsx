import React from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@actual-app/components/input';
import { View } from '@actual-app/components/view';

import { getMonthYearFormat } from 'loot-core/shared/months';
import { integerToAmount, amountToInteger } from 'loot-core/shared/util';

import { AmountInput } from './AmountInput';
import { PercentInput } from './PercentInput';

import { AccountAutocomplete } from '@desktop-client/components/autocomplete/AccountAutocomplete';
import { Autocomplete } from '@desktop-client/components/autocomplete/Autocomplete';
import { CategoryAutocomplete } from '@desktop-client/components/autocomplete/CategoryAutocomplete';
import { FilterAutocomplete } from '@desktop-client/components/autocomplete/FilterAutocomplete';
import { PayeeAutocomplete } from '@desktop-client/components/autocomplete/PayeeAutocomplete';
import { ReportAutocomplete } from '@desktop-client/components/autocomplete/ReportAutocomplete';
import { Checkbox } from '@desktop-client/components/forms';
import { DateSelect } from '@desktop-client/components/select/DateSelect';
import { RecurringSchedulePicker } from '@desktop-client/components/select/RecurringSchedulePicker';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { useReports } from '@desktop-client/hooks/useReports';
import { useSelector } from '@desktop-client/redux';

export function GenericInput({
  field,
  subfield,
  type,
  numberFormatType = undefined,
  multi,
  value,
  ref,
  style,
  onChange,
  op = undefined,
}) {
  const { t } = useTranslation();
  const { grouped: categoryGroups } = useCategories();
  const { data: savedReports } = useReports();
  const saved = useSelector(state => state.queries.saved);
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  const getNumberInputByFormatType = numberFormatType => {
    switch (numberFormatType) {
      case 'currency':
        return (
          <AmountInput
            inputRef={ref}
            value={amountToInteger(value)}
            onUpdate={v => onChange(integerToAmount(v))}
          />
        );
      case 'percentage':
        return (
          <PercentInput
            inputRef={ref}
            value={value}
            onUpdatePercent={onChange}
          />
        );
      default:
        return (
          <Input
            ref={ref}
            value={value || ''}
            placeholder={t('nothing')}
            onChangeValue={onChange}
          />
        );
    }
  };

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
                ref,
                ...(showPlaceholder ? { placeholder: t('nothing') } : null),
              }}
            />
          );
          break;

        case 'account':
          switch (op) {
            case 'onBudget':
            case 'offBudget':
              content = null;
              break;
            default:
              content = (
                <AccountAutocomplete
                  type={autocompleteType}
                  value={value}
                  openOnFocus={true}
                  onSelect={onChange}
                  inputProps={{
                    ref,
                    ...(showPlaceholder ? { placeholder: t('nothing') } : null),
                  }}
                />
              );
              break;
          }
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
                ref,
                ...(showPlaceholder ? { placeholder: t('nothing') } : null),
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
                ref,
                ...(showPlaceholder ? { placeholder: t('nothing') } : null),
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
                ref,
                ...(showPlaceholder ? { placeholder: t('nothing') } : null),
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
              ref={ref}
              value={value || ''}
              placeholder={getMonthYearFormat(dateFormat).toLowerCase()}
              onChangeValue={onChange}
            />
          );
          break;

        case 'year':
          content = (
            <Input
              ref={ref}
              value={value || ''}
              placeholder="yyyy"
              onChangeValue={onChange}
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
                inputRef={ref}
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
            inputProps={{ ref }}
            onSelect={onChange}
          />
        );
      } else if (type === 'number') {
        content = getNumberInputByFormatType(numberFormatType);
      } else {
        content = (
          <Input
            ref={ref}
            value={value || ''}
            placeholder={t('nothing')}
            onChangeValue={onChange}
          />
        );
      }
      break;
  }

  return <View style={{ flex: 1, ...style }}>{content}</View>;
}
