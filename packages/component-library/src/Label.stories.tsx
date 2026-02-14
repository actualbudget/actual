import type { Meta, StoryObj } from '@storybook/react-vite';

import { Input } from './Input';
import { Label } from './Label';
import { View } from './View';

const meta = {
  title: 'Components/Label',
  component: Label,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Label>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Username',
  },
  parameters: {
    docs: {
      description: {
        story: 'A basic label component for form fields.',
      },
    },
  },
};

export const WithInput: Story = {
  args: {
    title: 'Email Address',
  },
  render: args => (
    <View style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <Label {...args} />
      <Input placeholder="user@example.com" style={{ width: 250 }} />
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Label used with an input field in a vertical layout.',
      },
    },
  },
};

export const MultipleLabels: Story = {
  args: {
    title: 'First Name',
  },
  render: args => (
    <View style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
      <View style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Label {...args} />
        <Input style={{ width: 250 }} />
      </View>
      <View style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Label title="Last Name" />
        <Input style={{ width: 250 }} />
      </View>
      <View style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <Label title="Password" />
        <Input type="password" style={{ width: 250 }} />
      </View>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple labels and inputs in a form layout.',
      },
    },
  },
};

export const CustomStyle: Story = {
  args: {
    title: 'Custom Styled Label',
    style: {
      fontSize: 16,
      color: '#007bff',
      textAlign: 'left',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Label with custom styling applied.',
      },
    },
  },
};
