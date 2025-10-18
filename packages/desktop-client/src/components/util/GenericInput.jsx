import React from 'react';
import { useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Input } from '@actual-app/components/input';
import { View } from '@actual-app/components/view';

import { getMonthYearFormat } from 'loot-core/shared/months';

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
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

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
  options = undefined,
  inputStyle = undefined,
}) {
  const dispatch = useDispatch();
  const { isNarrowWidth } = useResponsive();
  const { t } = useTranslation();
  const { grouped: categoryGroups } = useCategories();
  const { data: savedReports } = useReports();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  // Helper function to open autocomplete modal with safe event handling
  const openAutocompleteModal = modalName => {
    dispatch(
      pushModal({
        modal: {
          name: modalName,
          options: {
            onSelect: newValue => {
              onChange(multi ? [...value, newValue] : newValue);
            },
          },
        },
      }),
    );
  };

  const getNumberInputByFormatType = numberFormatType => {
    switch (numberFormatType) {
      case 'currency':
        return (
          <AmountInput
            inputRef={ref}
            value={value}
            onUpdate={v => onChange(v)}
            sign={options?.inflow || options?.outflow ? '+' : undefined}
            inputStyle={inputStyle}
          />
        );
      case 'percentage':
        return (
          <PercentInput
            inputRef={ref}
            value={value}
            onUpdatePercent={onChange}
            inputStyle={inputStyle}
          />
        );
      default:
        return (
          <Input
            ref={ref}
            value={value || ''}
            placeholder={t('nothing')}
            onChangeValue={onChange}
            style={inputStyle}
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
              openOnFocus={!isNarrowWidth}
              updateOnValueChange={isNarrowWidth}
              value={value}
              onSelect={onChange}
              inputProps={{
                ref,
                ...(showPlaceholder ? { placeholder: t('nothing') } : null),
                onClick: () => {
                  if (!isNarrowWidth) {
                    return;
                  }

                  openAutocompleteModal('payee-autocomplete');
                },
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
                  openOnFocus={!isNarrowWidth}
                  updateOnValueChange={isNarrowWidth}
                  onSelect={onChange}
                  inputProps={{
                    ref,
                    ...(showPlaceholder ? { placeholder: t('nothing') } : null),
                    onClick: () => {
                      if (!isNarrowWidth) {
                        return;
                      }

                      openAutocompleteModal('account-autocomplete');
                    },
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
              openOnFocus={!isNarrowWidth}
              updateOnValueChange={isNarrowWidth}
              onSelect={onChange}
              showHiddenCategories={true}
              inputProps={{
                ref,
                ...(showPlaceholder ? { placeholder: t('nothing') } : null),
                onClick: () => {
                  if (!isNarrowWidth) {
                    return;
                  }

                  openAutocompleteModal('category-autocomplete');
                },
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
            style={inputStyle}
          />
        );
      }
      break;
  }

  return <View style={{ flex: 1, ...style }}>{content}</View>;
}
