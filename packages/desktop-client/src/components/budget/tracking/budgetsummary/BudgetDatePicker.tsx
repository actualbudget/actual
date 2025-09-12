import { useDateFormat } from '@desktop-client/hooks/useDateFormat';
import { DateSelect } from '@desktop-client/components//select/DateSelect';
import { trackingBudget } from '@desktop-client/spreadsheet/bindings';
import { useTrackingSheetValue } from '@desktop-client/components/budget/tracking/TrackingBudgetComponents';
import { useDispatch } from 'react-redux';
import { setBudgetDate } from '@desktop-client/budget/budgetSlice'; // Adjust import path
import type { AppDispatch } from '@desktop-client/redux/store'; // Import AppDispatch type

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
    datatype === 'StartDate' ? trackingBudget.startDate : trackingBudget.endDate
  );

  // Convert string integer date to ISO string for DateSelect
  const convertToISO = (numberDate: number): string=> {
    // Convert number to string and check if it has exactly 8 digits
    const stringDate = numberDate.toString();
    console.log('Converting number to ISO:', numberDate);
    const year = stringDate.substring(0, 4);
    const month = stringDate.substring(4, 6);
    const day = stringDate.substring(6, 8);
    const isodate = `${year}-${month}-${day}`;
    console.log('Converted Date', isodate);
    return isodate;
  };

  // Convert ISO string to integer date for your system
  const convertToInteger = (isoDate: string | null): number | null => {
    if (!isoDate) return null;
    const integerDate = parseInt(isoDate.replace(/-/g, ''), 10);
    console.log('Converting ISO to integer:', isoDate, '→', integerDate);
    return integerDate;
  };

  // Handle date change
  const handleDateChange = (isoDate: string | null) => {
    console.log('Date changed:', isoDate);
    // Convert ISO date to integer
    const integerDate = convertToInteger(isoDate);
    if (integerDate !== null) {
      // Dispatch the setBudgetDate action with the datatype
      dispatch(setBudgetDate({
        month,
        date: integerDate,
        type: datatype,
      }));
      console.log(`Dispatched ${datatype} update for month ${month} to ${integerDate}`);
    }
    // Call the optional onChange callback if provided
    onChange?.(isoDate);
  };

  return (
    <DateSelect
      value={convertToISO(sheetValue as number)} //let me fix that later
      dateFormat={dateFormat}
      onSelect={handleDateChange}
      containerProps={{
        style: {
          width,
          ...style
        }
      }}
      inputProps={{
        style: {
          textAlign: 'center',
          width: '100%',
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none'
        }
      }}
      clearOnBlur={true}
      openOnFocus={true}
    />
  );
}