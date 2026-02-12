import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './Button';
import { Text } from './Text';
import { Tooltip } from './Tooltip';
import { View } from './View';

const meta = {
  title: 'Components/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tooltip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: 'This is a tooltip',
    children: <Button>Hover me</Button>,
  },
  parameters: {
    docs: {
      description: {
        story: 'A basic tooltip displayed on hover after a short delay.',
      },
    },
  },
};

export const WithTextTrigger: Story = {
  args: {
    content: 'More information about this term',
    children: (
      <Text style={{ textDecoration: 'underline', cursor: 'help' }}>
        Hover for details
      </Text>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'A tooltip triggered by hovering over text.',
      },
    },
  },
};

export const RichContent: Story = {
  args: {
    content: (
      <View style={{ padding: 5, maxWidth: 200 }}>
        <Text style={{ fontWeight: 'bold' }}>Tip</Text>
        <Text>
          You can use keyboard shortcuts to navigate faster through the
          application.
        </Text>
      </View>
    ),
    children: <Button>Rich Tooltip</Button>,
  },
  parameters: {
    docs: {
      description: {
        story: 'Tooltip content can include rich React elements.',
      },
    },
  },
};

export const CustomPlacement: Story = {
  args: {
    content: 'Tooltip',
    children: <></>,
  },
  render: () => (
    <View style={{ gap: 10, display: 'flex', flexDirection: 'row' }}>
      <Tooltip content="Top placement" placement="top">
        <Button>Top</Button>
      </Tooltip>
      <Tooltip content="Bottom placement" placement="bottom">
        <Button>Bottom</Button>
      </Tooltip>
      <Tooltip content="Left placement" placement="left">
        <Button>Left</Button>
      </Tooltip>
      <Tooltip content="Right placement" placement="right">
        <Button>Right</Button>
      </Tooltip>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Tooltips can be placed in different positions around the trigger.',
      },
    },
  },
};

export const DisabledTooltip: Story = {
  args: {
    content: 'You should not see this',
    children: <Button>Hover me (disabled)</Button>,
    triggerProps: { isDisabled: true },
  },
  parameters: {
    docs: {
      description: {
        story:
          'A tooltip can be disabled via triggerProps, preventing it from appearing.',
      },
    },
  },
};

export const CustomDelay: Story = {
  args: {
    content: 'This tooltip appears after 1 second',
    children: <Button>Slow Tooltip</Button>,
    triggerProps: { delay: 1000 },
  },
  parameters: {
    docs: {
      description: {
        story: 'The delay before the tooltip appears can be customized.',
      },
    },
  },
};
