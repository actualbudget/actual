import type { Meta, StoryObj } from '@storybook/react-vite';

import { InlineField } from './InlineField';
import { Input } from './Input';
import { View } from './View';

const meta = {
  title: 'Components/InlineField',
  component: InlineField,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof InlineField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Name',
    width: 300,
    children: <Input style={{ flex: 1 }} />,
  },
  parameters: {
    docs: {
      description: {
        story:
          'InlineField displays a label and input side-by-side in a horizontal layout.',
      },
    },
  },
};

export const WithCustomLabelWidth: Story = {
  args: {
    label: 'Email Address',
    labelWidth: 120,
    width: 400,
    children: <Input style={{ flex: 1 }} placeholder="user@example.com" />,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Custom label width can be specified to accommodate longer labels.',
      },
    },
  },
};

export const MultipleFields: Story = {
  args: {
    label: 'First Name',
    width: 300,
  },
  render: args => (
    <View style={{ display: 'flex', flexDirection: 'column' }}>
      <InlineField {...args}>
        <Input style={{ flex: 1 }} />
      </InlineField>
      <InlineField label="Last Name" width={300}>
        <Input style={{ flex: 1 }} />
      </InlineField>
      <InlineField label="Email" width={300}>
        <Input style={{ flex: 1 }} type="email" />
      </InlineField>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Multiple InlineFields stack vertically with consistent label alignment.',
      },
    },
  },
};

export const WithPercentageWidth: Story = {
  args: {
    label: 'Description',
    width: '100%',
    children: <Input style={{ flex: 1 }} />,
  },
  decorators: [
    Story => (
      <View style={{ width: 400 }}>
        <Story />
      </View>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Width can be specified as a percentage for responsive layouts.',
      },
    },
  },
};
