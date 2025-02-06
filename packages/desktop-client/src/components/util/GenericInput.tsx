import React, { ReactElement, Ref } from 'react';

import { useReports } from 'loot-core/client/data-hooks/reports';
import { getMonthYearFormat } from 'loot-core/src/shared/months';
import { integerToAmount, amountToInteger } from 'loot-core/src/shared/util';

import { useCategories } from '../../hooks/useCategories';
import { useDateFormat } from '../../hooks/useDateFormat';
import { useSelector } from '../../redux';
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

import { AmountInput } from './AmountInput';
import { PercentInput } from './PercentInput';
import { RuleConditionOp } from 'loot-core/types/models';
import { CSSProperties } from '../../style';

type BaseProps = {
  inputRef?: Ref<HTMLInputElement>;
  style?: CSSProperties;
  op?: RuleConditionOp;
}

type SingleProps<T> = BaseProps & {
  multi?: false;
  value?: T;
  onChange: (value: T) => void;
}

type MultiProps<T> = BaseProps & {
  multi: true;
  value?: T[];
  onChange: (value: T[]) => void;
}

type NumberFormat = 'currency' | 'percentage';
type IdField = 'payee' | 'account' | 'category';
type SavedField = 'saved' | 'report';

type IdInputProps = { type: 'id'; field: IdField } & (SingleProps<unknown> | MultiProps<unknown>)
type SavedInputProps = { type: 'saved'; field: SavedField } & (SingleProps<unknown> | MultiProps<unknown>)
type DateInputProps = { type: 'date'; subfield?: 'month' | 'year' } & SingleProps<Date | string | { frequency: string; }>
type BooleanInputProps = { type: 'bolean' } & SingleProps<boolean>
type NumberInputProps = { type: 'number'; numberFormatType?: NumberFormat } & SingleProps<number>

type GenericInputProps = IdInputProps | SavedInputProps | DateInputProps | BooleanInputProps | NumberInputProps;

export function GenericInput({
  field,
  subfield,
  type,
  numberFormatType = undefined,
  multi,
  value,
  inputRef,
  style,
  onChange,
  op = undefined,
}: GenericInputProps): ReactElement {
  const { grouped: categoryGroups } = useCategories();
  const { data: savedReports } = useReports();
  const saved = useSelector(state => state.queries.saved);
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  const getNumberInputByFormatType = (numberFormatType?: NumberFormat) => {
    switch (numberFormatType) {
      case 'currency':
        return (
          <AmountInput
            inputRef={inputRef}
            value={amountToInteger(value)}
            onUpdate={v => onChange(integerToAmount(v))}
          />
        );
      case 'percentage':
        return (
          <PercentInput
            inputRef={inputRef}
            value={value}
            onUpdatePercent={onChange}
          />
        );
      default:
        return (
          <Input
            inputRef={inputRef}
            defaultValue={value || ''}
            placeholder="nothing"
            onEnter={e => onChange(e.target.value)}
            onBlur={e => onChange(e.target.value)}
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

  let content: ReactElement = null;
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
                    inputRef,
                    ...(showPlaceholder ? { placeholder: 'nothing' } : null),
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
      } else if (type === 'number') {
        content = getNumberInputByFormatType(numberFormatType);
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
