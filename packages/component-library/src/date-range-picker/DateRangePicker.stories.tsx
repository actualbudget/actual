import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { DateRangePicker } from './DateRangePicker';
import type { DateRangePickerLabels } from './util';

const labels: DateRangePickerLabels = {
  selectBy: 'Select by',
  quickSelect: 'Quick select',
  month: 'Month',
  day: 'Day',
  previous: 'Previous',
  next: 'Next',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  year: 'Year',
  dateRange: 'Date range',
};

const meta = {
  title: 'Components/DateRangePicker',
  component: DateRangePicker,
  parameters: {
    layout: 'centered',
  },
  args: {
    start: '2024-02',
    end: '2024-06',
    minDate: '2022-01',
    maxDate: '2025-12',
    locale: 'en-US',
    labels,
    onChangeDates: fn(),
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DateRangePicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MonthsOnly: Story = {};

export const WithDayGranularity: Story = {
  args: {
    granularities: ['month', 'day'],
  },
};

export const WithPresets: Story = {
  render: args => {
    const [range, setRange] = useState({ start: args.start, end: args.end });
    return (
      <DateRangePicker
        {...args}
        start={range.start}
        end={range.end}
        granularities={['month', 'day']}
        presets={[
          {
            key: '3-months',
            label: '3 months',
            onSelect: () => setRange({ start: '2024-04', end: '2024-06' }),
          },
          {
            key: '1-year',
            label: '1 year',
            onSelect: () => setRange({ start: '2023-07', end: '2024-06' }),
          },
        ]}
        onChangeDates={(start, end) => setRange({ start, end })}
      />
    );
  },
};
