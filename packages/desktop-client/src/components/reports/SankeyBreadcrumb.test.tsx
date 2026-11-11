import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { SankeyBreadcrumb } from './SankeyBreadcrumb';

describe('SankeyBreadcrumb', () => {
  it('renders nothing at the root level', () => {
    const { container } = render(
      <SankeyBreadcrumb segments={[]} rootLabel="Main" onNavigate={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the path and navigates to ancestors', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();

    render(
      <SankeyBreadcrumb
        segments={['Bills', 'Internet']}
        rootLabel="Main"
        onNavigate={onNavigate}
      />,
    );

    const trail = screen.getByTestId('sankey-breadcrumb');
    expect(trail).toHaveTextContent(/Main\s*›\s*Bills\s*›\s*Internet/);
    // The current level is not a link.
    expect(
      screen.queryByRole('button', { name: 'Internet' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Main$/ }));
    expect(onNavigate).toHaveBeenLastCalledWith(0);

    await user.click(screen.getByRole('button', { name: 'Bills' }));
    expect(onNavigate).toHaveBeenLastCalledWith(1);

    // The arrow steps back a single level.
    await user.click(screen.getByTestId('sankey-breadcrumb-back'));
    expect(onNavigate).toHaveBeenLastCalledWith(1);
  });
});
