import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { SvgAdd, SvgTrash } from './icons/v1';
import { SvgPencil1 } from './icons/v2';
import { Menu, type MenuItem } from './Menu';
import { Text } from './Text';
import { View } from './View';

const meta = {
  title: 'Components/Menu',
  component: Menu,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Menu>;

export default meta;

type Story = StoryObj<typeof meta>;

const basicItems: Array<MenuItem<string>> = [
  { name: 'edit', text: 'Edit' },
  { name: 'duplicate', text: 'Duplicate' },
  { name: 'delete', text: 'Delete' },
];

export const Default: Story = {
  args: {
    items: basicItems,
  },
  parameters: {
    docs: {
      description: {
        story: 'A basic menu with simple text items.',
      },
    },
  },
};

export const WithIcons: Story = {
  args: {
    items: [
      { name: 'add', text: 'Add New', icon: SvgAdd },
      { name: 'edit', text: 'Edit', icon: SvgPencil1 },
      { name: 'delete', text: 'Delete', icon: SvgTrash },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Menu items can include icons for visual clarity.',
      },
    },
  },
};

export const WithSeparator: Story = {
  args: {
    items: [
      { name: 'cut', text: 'Cut' },
      { name: 'copy', text: 'Copy' },
      { name: 'paste', text: 'Paste' },
      Menu.line,
      { name: 'delete', text: 'Delete' },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Menu.line creates a visual separator between menu sections.',
      },
    },
  },
};

export const WithLabel: Story = {
  args: {
    items: [
      { type: Menu.label, name: 'Actions', text: 'Actions' },
      { name: 'edit', text: 'Edit' },
      { name: 'duplicate', text: 'Duplicate' },
      Menu.line,
      { type: Menu.label, name: 'Danger Zone', text: 'Danger Zone' },
      { name: 'delete', text: 'Delete' },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Menu.label items create section headers within the menu.',
      },
    },
  },
};

export const WithDisabledItems: Story = {
  args: {
    items: [
      { name: 'edit', text: 'Edit' },
      { name: 'duplicate', text: 'Duplicate', disabled: true },
      { name: 'delete', text: 'Delete' },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled menu items are visually muted and non-interactive.',
      },
    },
  },
};

export const WithKeyboardShortcuts: Story = {
  args: {
    items: [
      { name: 'cut', text: 'Cut', key: 'ctrl + X' },
      { name: 'copy', text: 'Copy', key: 'ctrl + C' },
      { name: 'paste', text: 'Paste', key: 'ctrl + V' },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Menu items can display keyboard shortcuts.',
      },
    },
  },
};

export const WithToggle: Story = {
  args: {
    items: [],
  },
  render: function Render() {
    const [settings, setSettings] = useState({
      notifications: true,
      darkMode: false,
      autoSave: true,
    });

    const items: Array<MenuItem<'notifications' | 'darkMode' | 'autoSave'>> = [
      {
        name: 'notifications',
        text: 'Notifications',
        toggle: settings.notifications,
      },
      { name: 'darkMode', text: 'Dark Mode', toggle: settings.darkMode },
      { name: 'autoSave', text: 'Auto Save', toggle: settings.autoSave },
    ];

    return (
      <Menu
        items={items}
        onMenuSelect={name => {
          setSettings(prev => ({ ...prev, [name]: !prev[name] }));
        }}
      />
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Menu items can include toggles for boolean settings.',
      },
    },
  },
};

export const WithHeaderAndFooter: Story = {
  args: {
    header: (
      <View style={{ padding: 10, borderBottom: '1px solid #ccc' }}>
        <Text style={{ fontWeight: 'bold' }}>Menu Title</Text>
      </View>
    ),
    footer: (
      <View style={{ padding: 10, borderTop: '1px solid #ccc' }}>
        <Text style={{ fontSize: 11, color: '#666' }}>3 items</Text>
      </View>
    ),
    items: basicItems,
  },
  parameters: {
    docs: {
      description: {
        story: 'Menus can have custom header and footer content.',
      },
    },
  },
};

export const WithTooltips: Story = {
  args: {
    items: [
      { name: 'edit', text: 'Edit', tooltip: 'Modify this item' },
      {
        name: 'duplicate',
        text: 'Duplicate',
        tooltip: 'Create a copy of this item',
      },
      {
        name: 'delete',
        text: 'Delete',
        tooltip: 'Permanently remove this item',
      },
    ],
  },
  parameters: {
    docs: {
      description: {
        story: 'Menu items can have tooltips for additional context.',
      },
    },
  },
};

export const InteractiveExample: Story = {
  args: {
    items: basicItems,
  },
  render: function Render(args) {
    const [selected, setSelected] = useState<string | null>(null);

    return (
      <View style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Menu {...args} onMenuSelect={name => setSelected(String(name))} />
        {selected && (
          <Text style={{ textAlign: 'center' }}>Selected: {selected}</Text>
        )}
      </View>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Interactive menu that shows the selected item.',
      },
    },
  },
};
