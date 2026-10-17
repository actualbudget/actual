import { MemoryRouter } from 'react-router';

import { send } from '@actual-app/core/platform/client/connection';
import { render, screen, waitFor } from '@testing-library/react';

import { OpenIdCallback } from './OpenIdCallback';

const dispatch = vi.hoisted(() => vi.fn());
vi.mock('@actual-app/core/platform/client/connection', () => ({
  send: vi.fn(),
}));
vi.mock('#redux', () => ({ useDispatch: () => dispatch }));
vi.mock('#users/usersSlice', () => ({ loggedIn: () => ({ type: 'login' }) }));

beforeEach(() => {
  vi.mocked(send).mockReset();
  dispatch.mockReset();
});

it('rejects unsolicited token URLs without changing credentials', () => {
  window.history.replaceState(null, '', '/openid-cb?token=attacker-token');
  render(
    <MemoryRouter>
      <OpenIdCallback />
    </MemoryRouter>,
  );
  expect(screen.getByText(/Unable to complete this login/)).toBeInTheDocument();
  expect(send).not.toHaveBeenCalled();
  expect(dispatch).not.toHaveBeenCalled();
});

it('does not initialise an account after a rejected callback', async () => {
  window.history.replaceState(null, '', '/openid-cb?code=code&state=state');
  vi.mocked(send).mockResolvedValue({ error: 'invalid-openid-callback' });
  render(
    <MemoryRouter>
      <OpenIdCallback />
    </MemoryRouter>,
  );
  expect(
    await screen.findByText(/Unable to complete this login/),
  ).toBeInTheDocument();
  expect(dispatch).not.toHaveBeenCalled();
});

it('retries after a fresh app starts before the backend is ready', async () => {
  window.history.replaceState(null, '', '/openid-cb?code=code&state=state');
  vi.mocked(send)
    .mockRejectedValueOnce(new Error('not ready'))
    .mockResolvedValue({});
  render(
    <MemoryRouter>
      <OpenIdCallback />
    </MemoryRouter>,
  );
  await waitFor(
    () => expect(dispatch).toHaveBeenCalledWith({ type: 'login' }),
    { timeout: 2500 },
  );
  expect(send).toHaveBeenLastCalledWith('subscribe-complete-openid', {
    code: 'code',
    state: 'state',
  });
});
