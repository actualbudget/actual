import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Text } from './Text';
import { Toggle } from './Toggle';
import { View } from './View';

const meta = {
  title: 'Components/Toggle',
  component: Toggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Toggle>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Off: Story = {
  args: {
    id: 'toggle-off',
    isOn: false,
  },
  parameters: {
    docs: {
      description: {
        story: 'Toggle in the off state.',
      },
    },
  },
};

export const On: Story = {
  args: {
    id: 'toggle-on',
    isOn: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Toggle in the on state.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    id: 'toggle-disabled',
    isOn: false,
    isDisabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'A disabled toggle that cannot be interacted with.',
      },
    },
  },
};

export const DisabledOn: Story = {
  args: {
    id: 'toggle-disabled-on',
    isOn: true,
    isDisabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'A disabled toggle in the on state.',
      },
    },
  },
};

export const Interactive: Story = {
  args: {
    id: 'toggle-interactive',
    isOn: false,
  },
  render: function Render() {
    const [isOn, setIsOn] = useState(false);

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Toggle id="toggle-interactive" isOn={isOn} onToggle={setIsOn} />
        <Text>{isOn ? 'Enabled' : 'Disabled'}</Text>
      </View>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'An interactive toggle with state feedback.',
      },
    },
  },
};

export const WithLabels: Story = {
  args: {
    id: 'toggle-labels',
    isOn: false,
  },
  render: function Render() {
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [autoSave, setAutoSave] = useState(true);

    return (
      <View style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Toggle
            id="toggle-notifications"
            isOn={notifications}
            onToggle={setNotifications}
          />
          <Text>Notifications</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Toggle
            id="toggle-dark-mode"
            isOn={darkMode}
            onToggle={setDarkMode}
          />
          <Text>Dark Mode</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Toggle
            id="toggle-auto-save"
            isOn={autoSave}
            onToggle={setAutoSave}
          />
          <Text>Auto Save</Text>
        </View>
      </View>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Multiple toggles in a settings-style layout.',
      },
    },
  },
};
