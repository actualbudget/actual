import type { Meta, StoryObj } from '@storybook/react-vite';

import { AlignedText } from './AlignedText';

const meta = {
  title: 'Components/AlignedText',
  component: AlignedText,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof AlignedText>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    left: 'Label',
    right: 'Value',
    style: { width: 300, display: 'flex' },
  },
  parameters: {
    docs: {
      description: {
        story:
          'AlignedText displays two pieces of content aligned on opposite sides.',
      },
    },
  },
};

export const TruncateLeft: Story = {
  args: {
    left: 'This is a very long label that should be truncated on the left side',
    right: '$100.00',
    truncate: 'left',
    style: { width: 250, display: 'flex' },
  },
  parameters: {
    docs: {
      description: {
        story:
          'When `truncate="left"`, the left content is truncated with ellipsis.',
      },
    },
  },
};

export const TruncateRight: Story = {
  args: {
    left: 'Short Label',
    right:
      'This is a very long value that should be truncated on the right side',
    truncate: 'right',
    style: { width: 250, display: 'flex' },
  },
  parameters: {
    docs: {
      description: {
        story:
          'When `truncate="right"`, the right content is truncated with ellipsis.',
      },
    },
  },
};

export const FinancialAmount: Story = {
  args: {
    left: 'Groceries',
    right: '$1,234.56',
    style: { width: 300, display: 'flex' },
    rightStyle: { fontWeight: 'bold' },
  },
  parameters: {
    docs: {
      description: {
        story:
          'Example showing AlignedText used for displaying financial data.',
      },
    },
  },
};

export const WithCustomStyles: Story = {
  args: {
    left: 'Category',
    right: 'Amount',
    style: {
      width: 300,
      padding: 10,
      backgroundColor: '#f5f5f5',
      borderRadius: 4,
      display: 'flex',
    },
    leftStyle: { color: '#666', fontStyle: 'italic' },
    rightStyle: { color: '#333', fontWeight: 'bold' },
  },
};

export const MultipleRows: Story = {
  args: {
    left: 'Income',
    right: '$5,000.00',
  },
  render: () => (
    <div
      style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <AlignedText
        left="Income"
        right="$5,000.00"
        rightStyle={{ color: 'green' }}
        style={{ display: 'flex' }}
      />
      <AlignedText
        left="Expenses"
        right="-$3,200.00"
        rightStyle={{ color: 'red' }}
        style={{ display: 'flex' }}
      />
      <AlignedText
        left="Balance"
        right="$1,800.00"
        style={{ borderTop: '1px solid #ccc', paddingTop: 8, display: 'flex' }}
        rightStyle={{ fontWeight: 'bold' }}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Multiple AlignedText components stacked to create a summary view.',
      },
    },
  },
};
