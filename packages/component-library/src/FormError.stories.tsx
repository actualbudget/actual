import type { Meta, StoryObj } from '@storybook/react-vite';

import { FormError } from './FormError';
import { Input } from './Input';
import { View } from './View';

const meta = {
  title: 'Components/FormError',
  component: FormError,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof FormError>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'This field is required',
  },
  parameters: {
    docs: {
      description: {
        story: 'FormError displays validation error messages in red text.',
      },
    },
  },
};

export const InFormContext: Story = {
  render: () => (
    <View
      style={{ display: 'flex', flexDirection: 'column', gap: 5, width: 250 }}
    >
      <Input placeholder="Email address" style={{ borderColor: 'red' }} />
      <FormError>Please enter a valid email address</FormError>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'FormError displayed below an input field with validation error.',
      },
    },
  },
};

export const MultipleErrors: Story = {
  render: () => (
    <View style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <FormError>Password must be at least 8 characters</FormError>
      <FormError>Password must contain a number</FormError>
      <FormError>Password must contain a special character</FormError>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Multiple FormError components for displaying several validation errors.',
      },
    },
  },
};

export const CustomStyle: Story = {
  args: {
    children: 'Custom styled error message',
    style: {
      fontSize: 14,
      fontWeight: 'bold',
      padding: 10,
      backgroundColor: '#ffebee',
      borderRadius: 4,
      border: '1px solid red',
    },
  },
};

export const LongErrorMessage: Story = {
  args: {
    children:
      'This is a longer error message that explains the validation issue in more detail. Please correct the input and try again.',
    style: { maxWidth: 300 },
  },
};
