import type { Meta, StoryObj } from '@storybook/react-vite';

import { TextOneLine } from './TextOneLine';
import { View } from './View';

const meta = {
  title: 'Components/TextOneLine',
  component: TextOneLine,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TextOneLine>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children:
      'This is a single line of text that will be truncated with an ellipsis if it overflows its container',
    style: { maxWidth: 300 },
  },
  parameters: {
    docs: {
      description: {
        story:
          'TextOneLine truncates overflowing text with an ellipsis, keeping content to a single line.',
      },
    },
  },
};

export const ShortText: Story = {
  args: {
    children: 'Short text',
    style: { maxWidth: 300 },
  },
  parameters: {
    docs: {
      description: {
        story: 'When text fits within the container, no truncation occurs.',
      },
    },
  },
};

export const NarrowContainer: Story = {
  args: {
    children:
      'This text will be truncated because the container is very narrow',
    style: { maxWidth: 120 },
  },
  parameters: {
    docs: {
      description: {
        story: 'A narrow container forces earlier truncation.',
      },
    },
  },
};

export const ComparisonWithText: Story = {
  render: () => (
    <View style={{ gap: 15, maxWidth: 200 }}>
      <View>
        <strong>TextOneLine:</strong>
        <TextOneLine>
          This is a long piece of text that should be truncated
        </TextOneLine>
      </View>
      <View>
        <strong>Regular span:</strong>
        <span>This is a long piece of text that will wrap normally</span>
      </View>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Comparison between TextOneLine (truncated) and regular text (wrapping).',
      },
    },
  },
};

export const WithCustomStyle: Story = {
  args: {
    children: 'Bold truncated text in a constrained container',
    style: {
      maxWidth: 200,
      fontWeight: 'bold',
      fontSize: 16,
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'TextOneLine with additional custom styles applied.',
      },
    },
  },
};
