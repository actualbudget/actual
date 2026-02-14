import type { Meta, StoryObj } from '@storybook/react-vite';

import { Block } from './Block';
import { theme } from './theme';

const meta = {
  title: 'Components/Block',
  component: Block,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Block>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'This is a Block component',
  },
  parameters: {
    docs: {
      description: {
        story:
          'Block is a basic div wrapper that accepts Emotion CSS styles via the `style` prop.',
      },
    },
  },
  tags: ['autodocs'],
};

export const WithStyles: Story = {
  args: {
    children: 'Styled Block',
    style: {
      padding: 20,
      backgroundColor: theme.cardBackground,
      borderRadius: 8,
      border: `1px solid ${theme.cardBorder}`,
      color: theme.pageText,
    },
  },
};

export const WithFlexLayout: Story = {
  render: () => (
    <Block
      style={{
        display: 'flex',
        gap: 10,
        padding: 15,
        borderRadius: 4,
        color: theme.pageText,
      }}
    >
      <Block
        style={{
          padding: 10,
          backgroundColor: theme.cardBackground,
          borderRadius: 4,
          border: `1px solid ${theme.cardBorder}`,
        }}
      >
        Item 1
      </Block>
      <Block
        style={{
          padding: 10,
          backgroundColor: theme.cardBackground,
          borderRadius: 4,
          border: `1px solid ${theme.cardBorder}`,
        }}
      >
        Item 2
      </Block>
      <Block
        style={{
          padding: 10,
          backgroundColor: theme.cardBackground,
          borderRadius: 4,
          border: `1px solid ${theme.cardBorder}`,
        }}
      >
        Item 3
      </Block>
    </Block>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Block components can be nested and styled with flexbox.',
      },
    },
  },
};

export const AsContainer: Story = {
  args: {
    children: 'Container Block',
    style: {
      width: 300,
      padding: 25,
      textAlign: 'center',
      backgroundColor: theme.cardBackground,
      border: `2px dashed ${theme.cardBorder}`,
      borderRadius: 8,
      color: theme.pageText,
    },
  },
};
