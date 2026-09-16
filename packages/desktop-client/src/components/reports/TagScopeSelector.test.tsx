import { useState } from 'react';
import type { ReactNode } from 'react';

import type {
  CustomReportTagScope,
  TagEntity,
} from '@actual-app/core/types/models';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';

import { TagScopeSelector } from './TagScopeSelector';

function render(ui: ReactNode) {
  return rtlRender(ui, { wrapper: TestProviders });
}

const tags: TagEntity[] = [
  { id: 'red-id', tag: 'red' },
  { id: 'circle-id', tag: 'circle' },
  { id: 'blue-id', tag: 'blue' },
  { id: 'hidden-id', tag: 'hidden', hidden: true },
];

function Harness({ initialScope }: { initialScope: CustomReportTagScope }) {
  const [scope, setScope] = useState(initialScope);
  return <TagScopeSelector tags={tags} tagScope={scope} onChange={setScope} />;
}

describe('TagScopeSelector', () => {
  it.each([
    { tagIds: ['red-id', 'circle-id', 'blue-id'] },
    { tagIds: ['missing-id'] },
    { tagIds: ['red-id', 'missing-id'] },
  ])('does not change an untouched saved scope $tagIds', async ({ tagIds }) => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TagScopeSelector
        tags={tags}
        tagScope={{ mode: 'selected', tagIds }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: /Tag scope:/ }));
    await user.keyboard('{Escape}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('can remove and reselect a tag without changing its ID', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TagScopeSelector
        tags={tags}
        tagScope={{ mode: 'selected', tagIds: ['red-id', 'circle-id'] }}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Tag scope: 2 tags' }));
    await user.click(screen.getByRole('button', { name: '#red' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Search tags' }),
      'red',
    );
    await user.click(screen.getByRole('button', { name: '#red' }));
    await user.keyboard('{Escape}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('searches tags and summarizes a selected singleton', async () => {
    const user = userEvent.setup();
    render(<Harness initialScope={{ mode: 'all' }} />);

    await user.click(
      screen.getByRole('button', { name: 'Tag scope: All tags' }),
    );
    expect(
      screen.queryByRole('button', { name: '#hidden' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '#circle' })).toBeInTheDocument();
    await user.type(
      screen.getByRole('textbox', { name: 'Search tags' }),
      'red',
    );

    expect(
      screen.queryByRole('button', { name: '#circle' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '#red' }));
    await user.keyboard('{Escape}');

    expect(
      screen.getByRole('button', { name: 'Tag scope: #red' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tag scope: #red' }));
    await user.click(screen.getByRole('button', { name: '#red' }));
    await user.click(screen.getByRole('textbox', { name: 'Search tags' }));
    await user.keyboard('{Escape}');
    expect(
      screen.getByRole('button', { name: 'Tag scope: All tags' }),
    ).toBeInTheDocument();
  });
});
