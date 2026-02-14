import { useState } from 'react';
import { ColorSwatch } from 'react-aria-components';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Button } from './Button';
import { ColorPicker } from './ColorPicker';

const meta = {
  title: 'Components/ColorPicker',
  component: ColorPicker,
  parameters: {
    layout: 'centered',
  },
  args: {
    onChange: fn(),
    children: <Button>Pick a color</Button>,
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ColorPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultValue: '#690CB0',
    children: <Button>Pick a color</Button>,
  },
};

export const WithColorSwatch: Story = {
  args: {
    defaultValue: '#1976D2',
    children: (
      <Button style={{ padding: 4 }}>
        <ColorSwatch
          style={{
            width: 24,
            height: 24,
            borderRadius: 4,
            boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.1)',
          }}
        />
      </Button>
    ),
  },
};

export const CustomColorSet: Story = {
  args: {
    defaultValue: '#FF0000',
    columns: 4,
    colorset: [
      '#FF0000',
      '#00FF00',
      '#0000FF',
      '#FFFF00',
      '#FF00FF',
      '#00FFFF',
      '#FFA500',
      '#800080',
    ],
    children: <Button>Custom Colors</Button>,
  },
  parameters: {
    docs: {
      description: {
        story:
          'ColorPicker with a custom color set and different column layout.',
      },
    },
  },
};

export const Controlled: Story = {
  args: {
    children: <Button>Pick a color</Button>,
  },
  render: () => {
    const [color, setColor] = useState('#388E3C');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ColorPicker value={color} onChange={c => setColor(c.toString('hex'))}>
          <Button style={{ padding: 4 }}>
            <ColorSwatch
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
              }}
            />
          </Button>
        </ColorPicker>
        <span>Selected: {color}</span>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Controlled ColorPicker with external state management.',
      },
    },
  },
};
