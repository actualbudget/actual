import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  // Actual's useNavigate turns opening the page you came from into going
  // back; these tests need plain pushes, replaces and pops.
  // oxlint-disable-next-line eslint/no-restricted-imports
  useNavigate,
} from 'react-router';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MobilePageStack, NEW_PAGE_STACK_STATE } from './MobilePageStack';

let mockIsNarrowWidth = true;
vi.mock('@actual-app/components/hooks/useResponsive', () => ({
  useResponsive: () => ({ isNarrowWidth: mockIsNarrowWidth }),
}));

// A page with state of its own (the notes field), so the tests can tell a
// page that was kept alive from one that was rebuilt.
function TestPage() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const pageNumber = Number(pathname.split('/').pop());
  return (
    <div>
      <h1>
        {pathname}
        {search}
      </h1>
      <input aria-label={`Notes for ${pathname}`} />
      <button onClick={() => void navigate(`/page/${pageNumber + 1}`)}>
        Open next
      </button>
      <button onClick={() => void navigate(-1)}>Back</button>
      <button
        onClick={() => void navigate(`${pathname}?search=x`, { replace: true })}
      >
        Search
      </button>
      <button
        onClick={() =>
          void navigate('/page/100', { state: NEW_PAGE_STACK_STATE })
        }
      >
        Switch tab
      </button>
    </div>
  );
}

function renderStack() {
  return render(
    <MemoryRouter initialEntries={['/page/1']}>
      <MobilePageStack>
        <Routes>
          <Route path="/page/:id" element={<TestPage />} />
        </Routes>
      </MobilePageStack>
    </MemoryRouter>,
  );
}

// Every page in the stack, shown or hidden.
function mountedPages() {
  return screen
    .getAllByRole('heading', { hidden: true })
    .map(heading => heading.textContent);
}

function shownPage() {
  return screen.getByRole('heading').textContent;
}

describe('MobilePageStack', () => {
  beforeEach(() => {
    mockIsNarrowWidth = true;
  });

  it('keeps the previous page alive, but hidden, while another is open', async () => {
    const user = userEvent.setup();
    renderStack();

    await user.click(screen.getByRole('button', { name: 'Open next' }));

    expect(shownPage()).toBe('/page/2');
    expect(mountedPages()).toEqual(['/page/1', '/page/2']);
  });

  it('shows the previous page exactly as it was left when going back', async () => {
    const user = userEvent.setup();
    renderStack();
    await user.type(screen.getByLabelText('Notes for /page/1'), 'groceries');

    await user.click(screen.getByRole('button', { name: 'Open next' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));

    expect(shownPage()).toBe('/page/1');
    expect(mountedPages()).toEqual(['/page/1']);
    expect(screen.getByLabelText('Notes for /page/1')).toHaveValue('groceries');
  });

  it('keeps the page when its URL is replaced, e.g. by typing a search', async () => {
    const user = userEvent.setup();
    renderStack();
    await user.type(screen.getByLabelText('Notes for /page/1'), 'groceries');

    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(shownPage()).toBe('/page/1?search=x');
    expect(screen.getByLabelText('Notes for /page/1')).toHaveValue('groceries');

    // Going back after opening another page returns to the replaced URL.
    await user.click(screen.getByRole('button', { name: 'Open next' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(shownPage()).toBe('/page/1?search=x');
    expect(screen.getByLabelText('Notes for /page/1')).toHaveValue('groceries');
  });

  it('starts a new stack when switching tabs', async () => {
    const user = userEvent.setup();
    renderStack();
    await user.click(screen.getByRole('button', { name: 'Open next' }));

    await user.click(screen.getByRole('button', { name: 'Switch tab' }));

    expect(shownPage()).toBe('/page/100');
    expect(mountedPages()).toEqual(['/page/100']);
  });

  it('keeps at most five pages behind the shown one', async () => {
    const user = userEvent.setup();
    renderStack();

    for (let i = 0; i < 7; i++) {
      await user.click(screen.getByRole('button', { name: 'Open next' }));
    }

    expect(shownPage()).toBe('/page/8');
    expect(mountedPages()).toEqual([
      '/page/3',
      '/page/4',
      '/page/5',
      '/page/6',
      '/page/7',
      '/page/8',
    ]);
  });

  it('starts over from a page that was dropped from the stack', async () => {
    const user = userEvent.setup();
    renderStack();
    await user.type(screen.getByLabelText('Notes for /page/1'), 'groceries');
    for (let i = 0; i < 6; i++) {
      await user.click(screen.getByRole('button', { name: 'Open next' }));
    }

    // Page 1 fell off the stack, so going all the way back rebuilds it.
    for (let i = 0; i < 6; i++) {
      await user.click(screen.getByRole('button', { name: 'Back' }));
    }

    expect(shownPage()).toBe('/page/1');
    expect(mountedPages()).toEqual(['/page/1']);
    expect(screen.getByLabelText('Notes for /page/1')).toHaveValue('');
  });

  it('shows only the current page on wider screens', async () => {
    mockIsNarrowWidth = false;
    const user = userEvent.setup();
    renderStack();

    await user.click(screen.getByRole('button', { name: 'Open next' }));

    expect(mountedPages()).toEqual(['/page/2']);
  });
});
