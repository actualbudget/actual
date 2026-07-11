import { useContext } from 'react';
import { RangeCalendarStateContext } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

type YearSelectProps = {
  /** Inclusive ISO date bounds; only the year part is read. */
  min: string;
  max: string;
};

// react-aria's CalendarYearPicker windows its year list by stepping whole
// years from minValue, which drops maxValue's year whenever the range doesn't
// span full years — for a budget that's most of the time. Build the list from
// the bounds' years instead; setFocusedDate clamps to [minValue, maxValue].
export function YearSelect({ min, max }: YearSelectProps) {
  const { t } = useTranslation();
  const state = useContext(RangeCalendarStateContext);
  if (!state) return null;
  const minYear = parseInt(min.slice(0, 4), 10);
  const maxYear = parseInt(max.slice(0, 4), 10);
  const years = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => minYear + i,
  );
  return (
    <select
      aria-label={t('Year')}
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
