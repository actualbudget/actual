import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './Button';
import { View } from './View';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Button',
  },
  parameters: {
    docs: {
      description: {
        story:
          'A basic button. Without an explicit size it keeps the legacy compact look.',
      },
    },
  },
};

export const Variants: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      <Button>Normal</Button>
      <Button variant="primary">Primary</Button>
      <Button variant="bare">Bare</Button>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story: 'The available button variants: normal, primary and bare.',
      },
    },
  },
};

export const Sizes: Story = {
  render: () => (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
      <Button size="small">Small</Button>
      <Button size="medium">Medium</Button>
      <Button size="large">Large</Button>
      <Button size="extra-large">Extra Large</Button>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Standard sizes. Values adapt to the viewport: resize the story canvas below 512px, 730px and 1100px to see the responsive steps.',
      },
    },
  },
};

export const SizeVariantGrid: Story = {
  render: () => (
    <View style={{ gap: 10 }}>
      {(['small', 'medium', 'large', 'extra-large'] as const).map(size => (
        <View
          key={size}
          style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}
        >
          <View style={{ width: 90 }}>
            {size === 'extra-large' ? 'extra-large' : size}
          </View>
          <Button size={size}>Normal</Button>
          <Button size={size} variant="primary">
            Primary
          </Button>
          <Button size={size} variant="bare">
            Bare
          </Button>
        </View>
      ))}
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Every size across the normal, primary and bare variants.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    children: 'Disabled button',
    isDisabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled buttons prevent user interaction.',
      },
    },
  },
};
