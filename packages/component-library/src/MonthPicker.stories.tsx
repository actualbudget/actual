import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { MonthPicker } from './MonthPicker';

const meta = {
  title: 'Components/MonthPicker',
  component: MonthPicker,
  parameters: {
    layout: 'centered',
  },
  args: {
    value: '2024-06',
    locale: 'en-US',
    labels: { previous: 'Previous', next: 'Next' },
    onChange: fn(),
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MonthPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => {
    const [value, setValue] = useState(args.value);
    return <MonthPicker {...args} value={value} onChange={setValue} />;
  },
};

export const WithBounds: Story = {
  args: {
    minDate: '2023-04',
    maxDate: '2025-09',
  },
};

export const Empty: Story = {
  args: {
    value: '',
    placeholder: 'Select month',
  },
};
