import { useContext } from 'react';
import { RangeCalendarStateContext } from 'react-aria-components';

// react-aria's CalendarYearPicker windows its year list by stepping whole
// years from minValue, which drops maxValue's year whenever the range doesn't
// span full years — for a budget that's most of the time. Build the list from
// the bounds' years instead; setFocusedDate clamps to [minValue, maxValue].
export function YearSelect({ label }: { label: string }) {
  const state = useContext(RangeCalendarStateContext);
  if (!state) return null;
  const minYear = state.minValue?.year ?? state.focusedDate.year;
  // An omitted upper bound arrives as a far-future sentinel; don't render
  // thousands of year options for it. Keep the focused year listed so the
  // select stays valid when navigating past the cap via the arrow buttons.
  const maxYear = Math.min(
    state.maxValue?.year ?? state.focusedDate.year,
    Math.max(state.focusedDate.year, new Date().getFullYear() + 10),
  );
  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => minYear + i,
  );
  return (
    <select
      aria-label={label}
      value={state.focusedDate.year}
      onChange={e =>
        state.setFocusedDate(
          state.focusedDate.set({ year: Number(e.target.value) }),
        )
      }
    >
      {years.map(year => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </select>
  );
}
