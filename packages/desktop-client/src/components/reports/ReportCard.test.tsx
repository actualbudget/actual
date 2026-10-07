import React from 'react';
import { MemoryRouter } from 'react-router';

import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TestProviders } from '#mocks';

import { ReportCard } from './ReportCard';

type IntersectionCallback = (
  entries: Array<Pick<IntersectionObserverEntry, 'isIntersecting' | 'target'>>,
) => void;

let observers: IntersectionObserverStub[] = [];

// jsdom doesn't implement IntersectionObserver. This stub records what is
// observed so a test can simulate the observed elements scrolling into view.
class IntersectionObserverStub {
  callback: IntersectionCallback;
  observed: Element[] = [];
  isDisconnected = false;

  constructor(callback: IntersectionCallback) {
    this.callback = callback;
    observers.push(this);
  }

  observe(element: Element) {
    this.observed.push(element);
  }

  unobserve() {
    // no-op
  }

  disconnect() {
    this.isDisconnected = true;
  }
}

// Like a real IntersectionObserver, only elements that are still in the
// document can intersect the viewport.
function scrollCardsIntoView() {
  act(() => {
    observers
      .filter(observer => !observer.isDisconnected)
      .forEach(observer => {
        const targets = observer.observed.filter(
          element => element.isConnected,
        );
        if (targets.length > 0) {
          observer.callback(
            targets.map(target => ({ isIntersecting: true, target })),
          );
        }
      });
  });
}

function renderCard(isEditing: boolean) {
  return (
    <TestProviders>
      <MemoryRouter>
        <ReportCard
          widgetId="widget-1"
          to="/reports/net-worth/widget-1"
          isEditing={isEditing}
        >
          <span>Widget content</span>
        </ReportCard>
      </MemoryRouter>
    </TestProviders>
  );
}

describe('ReportCard', () => {
  beforeEach(() => {
    observers = [];
    vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders its content once the card scrolls into view', () => {
    render(renderCard(false));

    expect(screen.queryByText('Widget content')).not.toBeInTheDocument();

    scrollCardsIntoView();

    expect(screen.getByText('Widget content')).toBeInTheDocument();
  });

  it('keeps loading off-screen cards after edit mode is toggled', () => {
    const { rerender } = render(renderCard(false));

    // Enter edit mode before the card has scrolled into view.
    rerender(renderCard(true));
    scrollCardsIntoView();

    expect(screen.getByText('Widget content')).toBeInTheDocument();

    // Finishing editing keeps the loaded content.
    rerender(renderCard(false));

    expect(screen.getByText('Widget content')).toBeInTheDocument();
  });
});
