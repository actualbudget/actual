import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { GLOSSARY_TERM_IDS, useGlossary } from './glossary';
import { Term } from './Term';

describe('glossary', () => {
  it('defines every term in plain language', () => {
    const { result } = renderHook(() => useGlossary());

    for (const id of GLOSSARY_TERM_IDS) {
      const entry = result.current[id];
      expect(entry, `missing glossary entry for ${id}`).toBeDefined();
      expect(entry.title.trim().length).toBeGreaterThan(0);
      // A definition should be a real explanation, not a restatement.
      expect(entry.definition.trim().length).toBeGreaterThan(40);
      expect(entry.definition.toLowerCase()).not.toBe(
        entry.title.toLowerCase(),
      );
    }
  });

  it('links to documentation for the bigger concepts', () => {
    const { result } = renderHook(() => useGlossary());

    expect(result.current['envelope-budgeting'].learnMore).toMatch(
      /^https:\/\/actualbudget\.org\/docs/,
    );
    expect(result.current.schedule.learnMore).toMatch(
      /^https:\/\/actualbudget\.org\/docs/,
    );
  });
});

describe('Term', () => {
  it('renders the glossary title when no label is given', () => {
    render(<Term id="budgeted" />);

    expect(screen.getByTestId('term')).toHaveTextContent('Budgeted');
    expect(screen.getByTestId('term')).toHaveAttribute('data-term', 'budgeted');
  });

  it('renders a custom label', () => {
    render(<Term id="to-budget">Left to budget</Term>);

    expect(screen.getByTestId('term')).toHaveTextContent('Left to budget');
  });

  it('shows the definition while hovered and hides it again on leave', async () => {
    const user = userEvent.setup();
    render(<Term id="balance" />);

    expect(screen.queryByTestId('term-definition')).not.toBeInTheDocument();

    await user.hover(screen.getByTestId('term'));
    await waitFor(() =>
      expect(screen.getByTestId('term-definition')).toHaveTextContent(
        /What is left in the category/,
      ),
    );

    await user.unhover(screen.getByTestId('term'));
    await waitFor(() =>
      expect(screen.queryByTestId('term-definition')).not.toBeInTheDocument(),
    );
  });

  it('shows the definition on keyboard focus and hides it on escape', async () => {
    const user = userEvent.setup();
    render(<Term id="payee" />);

    act(() => {
      screen.getByTestId('term').focus();
    });
    await waitFor(() =>
      expect(screen.getByTestId('term-definition')).toBeInTheDocument(),
    );

    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByTestId('term-definition')).not.toBeInTheDocument(),
    );
  });

  it('can opt out of keyboard focus when nested inside another control', () => {
    render(
      <Term id="on-budget" isFocusable={false}>
        On budget
      </Term>,
    );

    expect(screen.getByTestId('term')).toHaveAttribute('tabindex', '-1');
  });

  it('exposes the definition to assistive technology', () => {
    render(<Term id="reconcile" />);

    expect(screen.getByTestId('term')).toHaveAttribute(
      'aria-description',
      expect.stringMatching(/bank statement/),
    );
  });
});
