import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { Menu } from './Menu';

describe('Menu', () => {
  it('disables the underlying toggle when an item is disabled', () => {
    const onSelect = vi.fn();
    render(
      <Menu
        onMenuSelect={onSelect}
        items={[
          { name: 'locked', text: 'Locked', toggle: false, disabled: true },
          { name: 'active', text: 'Active', toggle: true },
        ]}
      />,
    );

    const locked = screen.getByRole('checkbox', {
      name: 'Locked',
    }) as HTMLInputElement;
    expect(locked.disabled).toBe(true);
    expect(locked.checked).toBe(false);
    fireEvent.click(locked);
    expect(onSelect).not.toHaveBeenCalled();

    const active = screen.getByRole('checkbox', {
      name: 'Active',
    }) as HTMLInputElement;
    expect(active.disabled).toBe(false);
    expect(active.checked).toBe(true);
    fireEvent.click(active);
    expect(onSelect).toHaveBeenCalledWith('active');
  });
});
