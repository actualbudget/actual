import { act, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { SankeyZoomStage, ZOOM_DURATION } from './SankeyZoomStage';

vi.mock('#hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}));

describe('SankeyZoomStage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps the outgoing level visible while the new one animates in', () => {
    const { rerender } = render(
      <SankeyZoomStage levelKey="root" transition={null}>
        <div>Main chart</div>
      </SankeyZoomStage>,
    );
    expect(screen.getByText('Main chart')).toBeInTheDocument();

    rerender(
      <SankeyZoomStage
        levelKey="bills"
        transition={{
          direction: 'in',
          origin: { x: 10, y: 20, width: 30, height: 40, color: 'red' },
        }}
      >
        <div>Bills chart</div>
      </SankeyZoomStage>,
    );

    // Both levels are in the DOM during the transition...
    const leaving = document.querySelector('[data-zoom-layer="leaving"]');
    const current = document.querySelector('[data-zoom-layer="current"]');
    expect(leaving).toHaveTextContent('Main chart');
    expect(current).toHaveTextContent('Bills chart');
    expect(leaving).toHaveStyle({ pointerEvents: 'none' });

    // ...and the clicked node's rectangle grows to fill the stage.
    const overlay = screen.getByTestId('sankey-zoom-stage')
      .lastElementChild as HTMLElement;
    expect(overlay).toHaveStyle({
      left: '10px',
      top: '20px',
      width: '30px',
      height: '40px',
    });

    act(() => {
      vi.advanceTimersByTime(ZOOM_DURATION + 100);
    });
    expect(
      document.querySelector('[data-zoom-layer="leaving"]'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Main chart')).not.toBeInTheDocument();
    expect(screen.getByText('Bills chart')).toBeInTheDocument();
  });

  it('animates back out without an origin', () => {
    const { rerender } = render(
      <SankeyZoomStage levelKey="bills" transition={null}>
        <div>Bills chart</div>
      </SankeyZoomStage>,
    );

    rerender(
      <SankeyZoomStage levelKey="root" transition={{ direction: 'out' }}>
        <div>Main chart</div>
      </SankeyZoomStage>,
    );

    expect(
      document.querySelector('[data-zoom-layer="leaving"]'),
    ).toHaveTextContent('Bills chart');
    expect(
      document.querySelector('[data-zoom-layer="current"]'),
    ).toHaveTextContent('Main chart');

    act(() => {
      vi.advanceTimersByTime(ZOOM_DURATION + 100);
    });
    expect(
      document.querySelector('[data-zoom-layer="leaving"]'),
    ).not.toBeInTheDocument();
  });
});
