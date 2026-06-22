import React from 'react';
import type { ComponentPropsWithRef } from 'react';
import {
  Tab as ReactAriaTab,
  TabList as ReactAriaTabList,
  TabPanel as ReactAriaTabPanel,
  TabPanels as ReactAriaTabPanels,
  Tabs as ReactAriaTabs,
} from 'react-aria-components';
import type {
  TabListProps as ReactAriaTabListProps,
  TabPanelsProps as ReactAriaTabPanelsProps,
} from 'react-aria-components';

import { css, cx } from '@emotion/css';

import { theme } from './theme';

export type TabsProps = ComponentPropsWithRef<typeof ReactAriaTabs>;
export type TabListProps<T> = ReactAriaTabListProps<T>;
export type TabProps = ComponentPropsWithRef<typeof ReactAriaTab>;
export type TabPanelsProps<T> = ReactAriaTabPanelsProps<T>;
export type TabPanelProps = ComponentPropsWithRef<typeof ReactAriaTabPanel>;

const defaultTabsClassName = css({
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  '&[data-orientation="vertical"]': {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});

const defaultTabListClassName = css({
  display: 'inline-flex',
  width: 'fit-content',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
  borderRadius: 8,
  backgroundColor: theme.pageBackground,
  padding: 4,
  color: theme.pillText,
  '&[data-orientation="vertical"]': {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
});

const defaultTabClassName = css({
  display: 'inline-flex',
  minHeight: 24,
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 5,
  color: theme.pageTextLight,
  cursor: 'pointer',
  fontWeight: 500,
  padding: '4px 10px',
  transition: 'background-color .15s, box-shadow .15s, color .15s',
  '&[data-pressed]': {
    transform: 'translateY(1px)',
  },
  '&[data-selected]': {
    backgroundColor: theme.buttonPrimaryBackground,
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
    color: theme.buttonPrimaryText,
  },
  '&[data-disabled]': {
    cursor: 'default',
    opacity: 0.75,
  },
});

const defaultTabPanelsClassName = css({
  display: 'flex',
  flex: 1,
  minWidth: 0,
});

const defaultTabPanelClassName = css({
  flex: 1,
  minWidth: 0,
  outline: 0,
});

export function Tabs({ className, ref, ...props }: TabsProps) {
  return (
    <ReactAriaTabs
      ref={ref}
      className={
        typeof className === 'function'
          ? renderProps => cx(defaultTabsClassName, className(renderProps))
          : cx(defaultTabsClassName, className)
      }
      {...props}
    />
  );
}

export function TabList<T>({ className, ...props }: TabListProps<T>) {
  return (
    <ReactAriaTabList
      className={
        typeof className === 'function'
          ? renderProps => cx(defaultTabListClassName, className(renderProps))
          : cx(defaultTabListClassName, className)
      }
      {...props}
    />
  );
}

export function Tab({ className, ref, ...props }: TabProps) {
  return (
    <ReactAriaTab
      ref={ref}
      className={
        typeof className === 'function'
          ? renderProps => cx(defaultTabClassName, className(renderProps))
          : cx(defaultTabClassName, className)
      }
      {...props}
    />
  );
}

export function TabPanels<T>({ className, ...props }: TabPanelsProps<T>) {
  return (
    <ReactAriaTabPanels
      className={cx(defaultTabPanelsClassName, className)}
      {...props}
    />
  );
}

export function TabPanel({ className, ref, ...props }: TabPanelProps) {
  return (
    <ReactAriaTabPanel
      ref={ref}
      className={
        typeof className === 'function'
          ? renderProps => cx(defaultTabPanelClassName, className(renderProps))
          : cx(defaultTabPanelClassName, className)
      }
      {...props}
    />
  );
}
