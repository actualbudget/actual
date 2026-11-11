import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { TestProviders } from '#mocks';

import { ExportDashboardModal } from './ExportDashboardModal';

vi.mock('#hooks/useModalState', () => ({
  useModalState: () => ({
    isHidden: false,
    isActive: () => true,
    onClose: vi.fn(),
  }),
}));

describe('ExportDashboardModal', () => {
  it('offers PDF, PNG and JSON downloads', () => {
    render(
      <TestProviders>
        <ExportDashboardModal dashboardName="Main" onExport={vi.fn()} />
      </TestProviders>,
    );

    expect(screen.getByText('Export dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('export-dashboard-pdf')).toHaveTextContent(
      'PDF document',
    );
    expect(screen.getByTestId('export-dashboard-png')).toHaveTextContent(
      'PNG image',
    );
    expect(screen.getByTestId('export-dashboard-json')).toHaveTextContent(
      'JSON file',
    );
  });

  it('runs the chosen export and shows progress meanwhile', async () => {
    const user = userEvent.setup();
    let finish: (() => void) | undefined;
    const onExport = vi.fn(
      () =>
        new Promise<void>(resolve => {
          finish = resolve;
        }),
    );

    render(
      <TestProviders>
        <ExportDashboardModal dashboardName="Main" onExport={onExport} />
      </TestProviders>,
    );

    await user.click(screen.getByTestId('export-dashboard-pdf'));

    expect(onExport).toHaveBeenCalledWith('pdf');
    expect(screen.getByText('Preparing your download…')).toBeInTheDocument();
    // Other options cannot be triggered while an export is running.
    expect(screen.getByTestId('export-dashboard-png')).toBeDisabled();

    finish?.();
    await waitFor(() =>
      expect(
        screen.queryByText('Preparing your download…'),
      ).not.toBeInTheDocument(),
    );
  });
});
