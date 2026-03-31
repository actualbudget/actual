import type { Meta, StoryObj } from '@storybook/react-vite';

import { Text } from './Text';
import { View } from './View';

const meta = {
  title: 'Components/Text',
  component: Text,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'This is a text element',
  },
  parameters: {
    docs: {
      description: {
        story: 'A basic Text component renders as a span element.',
      },
    },
  },
};

export const WithStyle: Story = {
  args: {
    children: 'Styled text',
    style: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1a73e8',
    },
  },
  parameters: {
    docs: {
      description: {
        story: 'Text can accept custom styles via the style prop.',
      },
    },
  },
};

export const FontSizes: Story = {
  render: () => (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 12 }}>Small (12px)</Text>
      <Text style={{ fontSize: 14 }}>Default (14px)</Text>
      <Text style={{ fontSize: 18 }}>Medium (18px)</Text>
      <Text style={{ fontSize: 24 }}>Large (24px)</Text>
      <Text style={{ fontSize: 32 }}>Extra Large (32px)</Text>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Text at various font sizes.',
      },
    },
  },
};

export const FontWeights: Story = {
  render: () => (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: 300 }}>Light (300)</Text>
      <Text style={{ fontWeight: 400 }}>Normal (400)</Text>
      <Text style={{ fontWeight: 500 }}>Medium (500)</Text>
      <Text style={{ fontWeight: 600 }}>Semi Bold (600)</Text>
      <Text style={{ fontWeight: 700 }}>Bold (700)</Text>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Text at various font weights.',
      },
    },
  },
};

export const InlineUsage: Story = {
  render: () => (
    <View>
      <span>
        This is regular text with{' '}
        <Text style={{ fontWeight: 'bold', color: '#d32f2f' }}>
          highlighted
        </Text>{' '}
        and{' '}
        <Text style={{ fontStyle: 'italic', color: '#1a73e8' }}>
          emphasized
        </Text>{' '}
        portions.
      </span>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Text renders as a span, making it suitable for inline styling within other text.',
      },
    },
  },
};
