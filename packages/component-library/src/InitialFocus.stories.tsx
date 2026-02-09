import { type Ref } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { InitialFocus } from './InitialFocus';
import { Input } from './Input';
import { View } from './View';

const meta = {
  title: 'Components/InitialFocus',
  component: InitialFocus,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof InitialFocus>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithInput: Story = {
  args: {
    children: <Input placeholder="This input will be focused on mount" />,
  },
  render: args => (
    <View style={{ width: 300 }}>
      <InitialFocus {...args} />
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'InitialFocus automatically focuses its child element when the component mounts. The input will receive focus and have its text selected.',
      },
    },
  },
};

export const WithFunctionChild: Story = {
  args: {
    children: <Input placeholder="Focused via function child" />,
  },
  render: () => (
    <View style={{ width: 300 }}>
      <InitialFocus>
        {ref => (
          <Input
            ref={ref as Ref<HTMLInputElement>}
            placeholder="Focused via function child"
          />
        )}
      </InitialFocus>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'InitialFocus can accept a function as child for components that need custom ref handling.',
      },
    },
  },
};

export const MultipleInputsOnlyFirstFocused: Story = {
  args: {
    children: <Input placeholder="This one is focused" />,
  },
  render: args => (
    <View style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <InitialFocus {...args} />
      <Input placeholder="This one is not focused" />
      <Input placeholder="This one is also not focused" />
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'When multiple inputs are present, only the one wrapped in InitialFocus will receive initial focus.',
      },
    },
  },
};
