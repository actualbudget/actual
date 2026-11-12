import { render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { Background } from './Background';

vi.mock('./BackgroundImage', () => ({
  BackgroundImage: () => <g data-testid="background-artwork" />,
}));

it('keeps the background artwork mounted when its parent rerenders', async () => {
  const { rerender } = render(<Background />);
  const artwork = await screen.findByTestId('background-artwork');

  rerender(<Background />);

  await waitFor(() => {
    expect(screen.getByTestId('background-artwork')).toBe(artwork);
  });
});
