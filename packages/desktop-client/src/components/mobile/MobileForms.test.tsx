import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InputField } from './MobileForms';

describe('InputField', () => {
  const showPicker = vi.fn();

  beforeEach(() => {
    // jsdom does not implement showPicker
    HTMLInputElement.prototype.showPicker = showPicker;
  });

  afterEach(() => {
    showPicker.mockReset();
    Reflect.deleteProperty(HTMLInputElement.prototype, 'showPicker');
  });

  it('opens the native picker when a date field with an icon is clicked', async () => {
    render(
      <InputField
        type="date"
        iconStart={<span />}
        defaultValue="2026-02-10"
        data-testid="field"
      />,
    );

    await userEvent.click(screen.getByTestId('field'));

    expect(showPicker).toHaveBeenCalledTimes(1);
  });

  it('opens the native picker when a month field without an icon is clicked', async () => {
    render(
      <InputField type="month" defaultValue="2026-02" data-testid="field" />,
    );

    await userEvent.click(screen.getByTestId('field'));

    expect(showPicker).toHaveBeenCalledTimes(1);
  });

  it('does not open a picker for a text field', async () => {
    render(<InputField data-testid="field" />);

    await userEvent.click(screen.getByTestId('field'));

    expect(showPicker).not.toHaveBeenCalled();
  });

  it('still calls the provided onClick', async () => {
    const onClick = vi.fn();
    render(<InputField type="date" onClick={onClick} data-testid="field" />);

    await userEvent.click(screen.getByTestId('field'));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(showPicker).toHaveBeenCalledTimes(1);
  });

  it('ignores a browser that refuses to open the picker', async () => {
    showPicker.mockImplementation(() => {
      throw new DOMException('not allowed', 'NotAllowedError');
    });
    const onClick = vi.fn();
    render(<InputField type="date" onClick={onClick} data-testid="field" />);

    await userEvent.click(screen.getByTestId('field'));

    expect(showPicker).toHaveBeenCalledTimes(1);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
