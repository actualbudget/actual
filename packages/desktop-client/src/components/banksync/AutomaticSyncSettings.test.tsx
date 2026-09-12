import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { useSyncedPref } from '#hooks/useSyncedPref';
import { TestProviders } from '#mocks';

import { AutomaticSyncSettings } from './AutomaticSyncSettings';

vi.mock('#hooks/useSyncedPref', () => ({
  useSyncedPref: vi.fn(),
}));

const setPref = vi.fn();

/** Stands in for the synced pref, which can also change from another device. */
function mockInterval(value: string | undefined) {
  vi.mocked(useSyncedPref).mockReturnValue([value, setPref] as ReturnType<
    typeof useSyncedPref
  >);
}

// A fresh element each time: React can skip re-rendering when handed a
// referentially identical one, which would defeat the rerender test below.
const settings = () => (
  <TestProviders>
    <AutomaticSyncSettings />
  </TestProviders>
);

// `Select` renders a button showing the selected option's label plus a popover
// menu, so it is driven by clicking rather than selectOptions().
const intervalTrigger = () => screen.getByLabelText('Sync accounts');
const unitTrigger = () =>
  document.getElementById('bank-sync-interval-unit') as HTMLElement;
const numberField = () => screen.getByLabelText('every');

async function chooseOption(trigger: HTMLElement, label: string) {
  await userEvent.click(trigger);
  const menu = await screen.findByRole('menu');
  await userEvent.click(within(menu).getByRole('button', { name: label }));
}

describe('AutomaticSyncSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInterval('0');
  });

  it('hides the custom fields for a preset interval', () => {
    mockInterval('1440');
    render(settings());

    expect(intervalTrigger()).toHaveTextContent('Every day');
    expect(screen.queryByLabelText('every')).not.toBeInTheDocument();
  });

  it('shows the custom fields for a stored non-preset interval', () => {
    mockInterval('30');
    render(settings());

    expect(intervalTrigger()).toHaveTextContent('Custom interval');
    expect(numberField()).toHaveValue(30);
    expect(unitTrigger()).toHaveTextContent('minutes');
  });

  it('opens the custom fields when the pref becomes custom after mount', () => {
    mockInterval('1440');
    const { rerender } = render(settings());

    expect(screen.queryByLabelText('every')).not.toBeInTheDocument();

    // A custom value arriving from another device, or the pref loading late.
    mockInterval('45');
    rerender(settings());

    expect(intervalTrigger()).toHaveTextContent('Custom interval');
    expect(numberField()).toHaveValue(45);
  });

  it('does not persist a partly typed number', async () => {
    mockInterval('30');
    render(settings());

    // "30" -> "4": on its own this is below the floor, and clamping here would
    // stop the user ever reaching 45.
    await userEvent.clear(numberField());
    await userEvent.type(numberField(), '4');

    expect(setPref).not.toHaveBeenCalled();
    expect(numberField()).toHaveValue(4);
  });

  it('persists the completed number on blur', async () => {
    mockInterval('30');
    render(settings());

    await userEvent.clear(numberField());
    await userEvent.type(numberField(), '45');
    await userEvent.tab();

    expect(setPref).toHaveBeenCalledWith('45');
  });

  it('clamps a completed number below the floor', async () => {
    mockInterval('30');
    render(settings());

    await userEvent.clear(numberField());
    await userEvent.type(numberField(), '5');
    await userEvent.tab();

    expect(setPref).toHaveBeenCalledWith('15');
  });

  it('converts the value when the unit changes', async () => {
    mockInterval('30');
    render(settings());

    await chooseOption(unitTrigger(), 'hours');

    expect(setPref).toHaveBeenCalledWith('1800');
  });

  it('keeps the custom fields open when Custom is chosen from a preset', async () => {
    mockInterval('1440');
    render(settings());

    await chooseOption(intervalTrigger(), 'Custom interval');

    // 1440 is itself a preset, so the fields only stay open because the
    // explicit choice is remembered.
    expect(setPref).toHaveBeenCalledWith('1440');
    expect(numberField()).toBeInTheDocument();
  });
});
