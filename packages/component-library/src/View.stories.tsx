import type { Meta, StoryObj } from '@storybook/react-vite';

import { Text } from './Text';
import { View } from './View';

const meta = {
  title: 'Components/View',
  component: View,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof View>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'A basic View container',
    style: { padding: 20, backgroundColor: '#f5f5f5', borderRadius: 4 },
  },
  parameters: {
    docs: {
      description: {
        story:
          'View is the fundamental layout building block, rendering a styled div element.',
      },
    },
  },
};

export const FlexRow: Story = {
  render: () => (
    <View
      style={{
        display: 'flex',
        flexDirection: 'row',
        gap: 10,
        padding: 10,
        backgroundColor: '#f5f5f5',
      }}
    >
      <View
        style={{
          padding: 15,
          backgroundColor: '#e3f2fd',
          borderRadius: 4,
        }}
      >
        Item 1
      </View>
      <View
        style={{
          padding: 15,
          backgroundColor: '#e8f5e9',
          borderRadius: 4,
        }}
      >
        Item 2
      </View>
      <View
        style={{
          padding: 15,
          backgroundColor: '#fff3e0',
          borderRadius: 4,
        }}
      >
        Item 3
      </View>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Views arranged in a horizontal row using flexDirection.',
      },
    },
  },
};

export const FlexColumn: Story = {
  render: () => (
    <View
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: 10,
        backgroundColor: '#f5f5f5',
      }}
    >
      <View
        style={{ padding: 15, backgroundColor: '#e3f2fd', borderRadius: 4 }}
      >
        Row 1
      </View>
      <View
        style={{ padding: 15, backgroundColor: '#e8f5e9', borderRadius: 4 }}
      >
        Row 2
      </View>
      <View
        style={{ padding: 15, backgroundColor: '#fff3e0', borderRadius: 4 }}
      >
        Row 3
      </View>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Views stacked vertically in a column layout.',
      },
    },
  },
};

export const Nested: Story = {
  render: () => (
    <View
      style={{
        padding: 15,
        backgroundColor: '#f5f5f5',
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
      }}
    >
      <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>Parent View</Text>
      <View
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 10,
        }}
      >
        <View
          style={{
            flex: 1,
            padding: 10,
            backgroundColor: '#e3f2fd',
            borderRadius: 4,
          }}
        >
          Child 1 (flex: 1)
        </View>
        <View
          style={{
            flex: 2,
            padding: 10,
            backgroundColor: '#e8f5e9',
            borderRadius: 4,
          }}
        >
          Child 2 (flex: 2)
        </View>
      </View>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Nested Views demonstrating flex layout composition.',
      },
    },
  },
};

export const WithNativeStyle: Story = {
  args: {
    children: 'View with nativeStyle',
    nativeStyle: {
      padding: '20px',
      border: '2px dashed #999',
      borderRadius: '8px',
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          'The nativeStyle prop applies styles directly via the style attribute instead of using Emotion CSS.',
      },
    },
  },
};

export const CenteredContent: Story = {
  render: () => (
    <View
      style={{
        width: 300,
        height: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        border: '1px solid #ddd',
      }}
    >
      <Text>Centered Content</Text>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story: 'View used to center content both horizontally and vertically.',
      },
    },
  },
};
