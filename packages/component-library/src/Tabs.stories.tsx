import type { Meta, StoryObj } from '@storybook/react-vite';

import { Tab, TabList, TabPanel, TabPanels, Tabs } from './Tabs';

const meta = {
  title: 'Components/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Tabs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultSelectedKey="overview" style={{ width: 580 }}>
      <TabList aria-label="Report sections">
        <Tab id="overview">Overview</Tab>
        <Tab id="analytics">Analytics</Tab>
        <Tab id="reports">Reports</Tab>
        <Tab id="settings">Settings</Tab>
      </TabList>
      <TabPanels>
        <TabPanel id="overview">Overview content</TabPanel>
        <TabPanel id="analytics">Analytics content</TabPanel>
        <TabPanel id="reports">Reports content</TabPanel>
        <TabPanel id="settings">Settings content</TabPanel>
      </TabPanels>
    </Tabs>
  ),
};

export const Vertical: Story = {
  render: () => (
    <Tabs orientation="vertical" defaultSelectedKey="overview">
      <TabList aria-label="Report sections">
        <Tab id="overview">Overview</Tab>
        <Tab id="analytics">Analytics</Tab>
        <Tab id="reports">Reports</Tab>
      </TabList>
      <TabPanels style={{ minWidth: 240 }}>
        <TabPanel id="overview">Overview content</TabPanel>
        <TabPanel id="analytics">Analytics content</TabPanel>
        <TabPanel id="reports">Reports content</TabPanel>
      </TabPanels>
    </Tabs>
  ),
};
