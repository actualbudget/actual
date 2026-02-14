import type { JSX, Ref } from 'react';
import { useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { Input } from '@actual-app/components/input';
import type { CSSProperties } from '@actual-app/components/styles';
import { View } from '@actual-app/components/view';

import { getMonthYearFormat } from 'loot-core/shared/months';
import type { RecurConfig, RuleConditionOp } from 'loot-core/types/models';

import { AmountInput } from './AmountInput';
import { PercentInput } from './PercentInput';

import { AccountAutocomplete } from '@desktop-client/components/autocomplete/AccountAutocomplete';
import { Autocomplete } from '@desktop-client/components/autocomplete/Autocomplete';
import { CategoryAutocomplete } from '@desktop-client/components/autocomplete/CategoryAutocomplete';
import { CategoryGroupAutocomplete } from '@desktop-client/components/autocomplete/CategoryGroupAutocomplete';
import { FilterAutocomplete } from '@desktop-client/components/autocomplete/FilterAutocomplete';
import { PayeeAutocomplete } from '@desktop-client/components/autocomplete/PayeeAutocomplete';
import { ReportAutocomplete } from '@desktop-client/components/autocomplete/ReportAutocomplete';
import { Checkbox } from '@desktop-client/components/forms';
import { DateSelect } from '@desktop-client/components/select/DateSelect';
import { RecurringSchedulePicker } from '@desktop-client/components/select/RecurringSchedulePicker';
import { useCategories } from '@desktop-client/hooks/useCategories';
import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { pushModal } from '@desktop-client/modals/modalsSlice';
import { useDispatch } from '@desktop-client/redux';

type GenericInputProps = {
  ref?: Ref<HTMLInputElement>;
  style?: CSSProperties;
  inputStyle?: CSSProperties;
} & (
  | ((
      | {
          type: 'id';
          field: 'payee' | 'category' | 'category_group';
        }
      | {
          type: 'id';
          field: 'account';
          op?: RuleConditionOp;
        }
    ) &
      (
        | {
            multi: true;
            value: string[];
            onChange: (value: string[]) => void;
          }
        | {
            multi?: false;
            value: string;
            onChange: (value: string) => void;
          }
      ))
  | ({
      type: 'saved';
      field: 'saved' | 'report';
    } & (
      | {
          multi: true;
          value: string[];
          onChange: (value: string[]) => void;
        }
      | {
          multi?: false;
          value: string;
          onChange: (value: string) => void;
        }
    ))
  | ({
      type: 'date';
    } & (
      | {
          field: 'date' | 'month' | 'year';
          value: string;
          onChange: (value: string) => void;
        }
      | {
          field: 'date';
          value: RecurConfig;
          onChange: (value: RecurConfig) => void;
        }
    ))
  | {
      type: 'boolean';
      value: boolean;
      onChange: (value: boolean) => void;
    }
  | {
      type: 'number';
      value: number;
      onChange: (value: number) => void;
      numberFormatType?: 'currency' | 'percentage';
      options?: {
        inflow?: boolean;
        outflow?: boolean;
      };
    }
  | ({
      type: 'string';
    } & (
      | {
          multi: true;
          value: string[];
          onChange: (value: string[]) => void;
        }
      | {
          multi?: false;
          value: string;
          onChange: (value: string) => void;
        }
    ))
);

export const GenericInput = ({
  ref,
  style,
  inputStyle,
  ...props
}: GenericInputProps) => {
  const dispatch = useDispatch();
  const { isNarrowWidth } = useResponsive();
  const { t } = useTranslation();
  const { data: { grouped: categoryGroups } = { grouped: [] } } =
    useCategories();
  const dateFormat = useDateFormat() || 'MM/dd/yyyy';

  let content: JSX.Element | null = null;
  switch (props.type) {
    case 'id': {
      const showPlaceholder = props.multi ? props.value.length === 0 : true;
      const multiProps =
        props.multi === true
          ? {
              type: 'multi' as const,
              value: props.value,
              onSelect: props.onChange,
            }
          : {
              type: 'single' as const,
              value: props.value,
              onSelect: props.onChange,
            };

      switch (props.field) {
        case 'payee':
          content = (
            <PayeeAutocomplete
              {...multiProps}
              showMakeTransfer={false}
              openOnFocus={!isNarrowWidth}
              updateOnValueChange={isNarrowWidth}
              inputProps={{
                ref,
                ...(showPlaceholder ? { placeholder: t('nothing') } : null),
                onClick: () => {
                  if (!isNarrowWidth) {
                    return;
                  }

                  dispatch(
                    pushModal({
                      modal: {
                        name: 'payee-autocomplete',
                        options: {
                          onSelect: newValue => {
                            if (props.multi === true) {
                              props.onChange([...props.value, newValue]);
                              return;
                            }
                            props.onChange(newValue);
                          },
                        },
                      },
                    }),
                  );
                },
              }}
            />
          );
          break;

        case 'account':
          switch (props.op) {
            case 'onBudget':
            case 'offBudget':
              content = null;
              break;
            default:
              content = (
                <AccountAutocomplete
                  {...multiProps}
                  openOnFocus={!isNarrowWidth}
                  updateOnValueChange={isNarrowWidth}
                  inputProps={{
                    ref,
                    ...(showPlaceholder ? { placeholder: t('nothing') } : null),
                    onClick: () => {
                      if (!isNarrowWidth) {
                        return;
                      }

                      dispatch(
                        pushModal({
                          modal: {
                            name: 'account-autocomplete',
                            options: {
                              onSelect: newValue => {
                                if (props.multi === true) {
                                  props.onChange([...props.value, newValue]);
                                  return;
                                }
                                props.onChange(newValue);
                              },
                            },
                          },
                        }),
                      );
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
              {...multiProps}
              categoryGroups={categoryGroups}
              openOnFocus={!isNarrowWidth}
              updateOnValueChange={isNarrowWidth}
              showHiddenCategories
              inputProps={{
                ref,
                ...(showPlaceholder ? { placeholder: t('nothing') } : null),
                onClick: () => {
                  if (!isNarrowWidth) {
                    return;
                  }

                  dispatch(
                    pushModal({
                      modal: {
                        name: 'category-autocomplete',
                        options: {
                          onSelect: newValue => {
                            if (props.multi === true) {
                              props.onChange([...props.value, newValue]);
                              return;
                            }
                            props.onChange(newValue);
                          },
                        },
                      },
                    }),
                  );
                },
              }}
            />
          );
          break;

        case 'category_group':
          content = (
            <CategoryGroupAutocomplete
              {...multiProps}
              categoryGroups={categoryGroups}
              openOnFocus={!isNarrowWidth}
              updateOnValueChange={isNarrowWidth}
              showHiddenCategories
              inputProps={{
                ref,
                ...(showPlaceholder ? { placeholder: t('nothing') } : null),
                onClick: () => {
                  if (!isNarrowWidth) {
                    return;
                  }

                  dispatch(
                    pushModal({
                      modal: {
                        name: 'category-group-autocomplete',
                        options: {
                          onSelect: newValue => {
                            if (props.multi === true) {
                              props.onChange([...props.value, newValue]);
                              return;
                            }
                            props.onChange(newValue);
                          },
                        },
                      },
                    }),
                  );
                },
              }}
            />
          );
          break;

        default:
      }
      break;
    }

    case 'saved': {
      const showSavedPlaceholder = props.multi
        ? props.value.length === 0
        : true;
      const savedMultiProps =
        props.multi === true
          ? {
              type: 'multi' as const,
              value: props.value,
              onSelect: props.onChange,
            }
          : {
              type: 'single' as const,
              value: props.value,
              onSelect: props.onChange,
            };

      switch (props.field) {
        case 'saved':
          content = (
            <FilterAutocomplete
              {...savedMultiProps}
              openOnFocus
              inputProps={{
                ref,
                ...(showSavedPlaceholder
                  ? { placeholder: t('nothing') }
                  : null),
              }}
            />
          );
          break;
        case 'report':
          content = (
            <ReportAutocomplete
              {...savedMultiProps}
              openOnFocus
              inputProps={{
                ref,
                ...(showSavedPlaceholder
                  ? { placeholder: t('nothing') }
                  : null),
              }}
            />
          );
          break;

        default:
      }
      break;
    }

    case 'date':
      switch (props.field) {
        case 'month':
          content = (
            <Input
              ref={ref}
              value={props.value || ''}
              placeholder={getMonthYearFormat(dateFormat).toLowerCase()}
              onChangeValue={props.onChange}
            />
          );
          break;

        case 'year':
          content = (
            <Input
              ref={ref}
              value={props.value || ''}
              placeholder={t('yyyy')}
              onChangeValue={props.onChange}
            />
          );
          break;

        default:
          if (typeof props.value !== 'string') {
            content = (
              <RecurringSchedulePicker
                value={props.value}
                buttonStyle={{ justifyContent: 'flex-start' }}
                onChange={props.onChange}
              />
            );
          } else {
            content = (
              <DateSelect
                ref={ref}
                value={props.value}
                dateFormat={dateFormat}
                openOnFocus={false}
                inputProps={{ placeholder: dateFormat.toLowerCase() }}
                onSelect={props.onChange}
              />
            );
          }
          break;
      }
      break;

    case 'boolean':
      content = (
        <Checkbox
          checked={props.value}
          value={String(props.value)}
          onChange={() => props.onChange(!props.value)}
        />
      );
      break;

    case 'number':
      switch (props.numberFormatType) {
        case 'currency':
          content = (
            <AmountInput
              ref={ref}
              value={props.value}
              onUpdate={props.onChange}
              sign={
                props.options?.inflow || props.options?.outflow
                  ? '+'
                  : undefined
              }
              inputStyle={inputStyle}
            />
          );
          break;

        case 'percentage':
          content = (
            <PercentInput
              inputRef={ref}
              value={props.value}
              onUpdatePercent={props.onChange}
              style={inputStyle}
            />
          );
          break;

        default:
          content = (
            <Input
              ref={ref}
              value={props.value || ''}
              placeholder={t('nothing')}
              onChangeValue={newValue => props.onChange(Number(newValue))}
              style={inputStyle}
            />
          );
      }
      break;

    default:
      if (props.multi === true) {
        content = (
          <Autocomplete
            type="multi"
            suggestions={[]}
            value={props.value}
            inputProps={{ ref }}
            onSelect={props.onChange}
          />
        );
      } else {
        content = (
          <Input
            ref={ref}
            value={props.value || ''}
            placeholder={t('nothing')}
            onChangeValue={props.onChange}
            style={inputStyle}
          />
        );
      }
      break;
  }

  return <View style={{ flex: 1, ...style }}>{content}</View>;
};
