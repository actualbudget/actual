import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { DateSelect } from '@desktop-client/components//select/DateSelect';
import { trackingBudget } from '@desktop-client/spreadsheet/bindings';
import { useTrackingSheetValue } from '@desktop-client/components/budget/tracking/TrackingBudgetComponents';
import { useDispatch } from 'react-redux';
import { setBudgetDate } from '@desktop-client/budget/budgetSlice'; // Adjust import path
import type { AppDispatch } from '@desktop-client/redux/store'; // Import AppDispatch type
import * as monthUtils from 'loot-core/shared/months';

type BudgetDatePickerProps = {
  month: string; // Add month prop to know which month we're updating
  datatype: 'StartDate' | 'EndDate'; // New prop to specify date type
  onChange?: (date: string | null) => void; // Make optional since we handle internally now
  width?: number;
  style?: React.CSSProperties;
};

export function BudgetDatePicker({
  month,
  datatype,
  onChange,
  width = 120,
  style,
}: BudgetDatePickerProps) {
  const dispatch = useDispatch() as AppDispatch;
  const dateFormat = 'dd MMM';

  // Get the appropriate sheet value based on datatype
  const sheetValue = useTrackingSheetValue(
    datatype === 'StartDate'
      ? trackingBudget.startDate
      : trackingBudget.endDate,
  );

  // Handle date change
  const handleDateChange = (isoDate: string) => {
    console.log('Date changed:', isoDate);
    // Convert ISO date to integer
    const integerDate = monthUtils.isoToInteger(isoDate);
    // Dispatch the setBudgetDate action with the datatype
    dispatch(
      setBudgetDate({
        month,
        date: integerDate,
        type: datatype,
      }),
    );
    console.log(
      `Dispatched ${datatype} update for month ${month} to ${integerDate}`,
    );
    // Call the optional onChange callback if provided
    onChange?.(isoDate);
  };

  return (
    <DateSelect
      value={String(monthUtils.integerToISO(sheetValue))} //let me fix that later
      dateFormat={dateFormat}
      onSelect={handleDateChange}
      containerProps={{
        style: {
          width,
          ...style,
        },
      }}
      inputProps={{
        style: {
          textAlign: 'center',
          width: '100%',
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none',
        },
      }}
      clearOnBlur={true}
      openOnFocus={true}
    />
  );
}
