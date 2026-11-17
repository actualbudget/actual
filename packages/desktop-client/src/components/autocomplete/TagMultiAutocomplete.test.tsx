import { useState } from 'react';

import type { TagEntity } from '@actual-app/core/types/models';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '#mocks';

import { TagMultiAutocomplete } from './TagMultiAutocomplete';

const tags: TagEntity[] = [
  { id: 'red-id', tag: 'red' },
  { id: 'circle-id', tag: 'circle' },
];

function FilterTagPicker() {
  const [value, setValue] = useState('#missing #red');

  return (
    <TestProviders>
      <TagMultiAutocomplete
        tags={tags}
        value={value}
        setValue={setValue}
        embedded
        inputProps={{ 'aria-label': 'Choose tags' }}
      />
      <output>{value}</output>
    </TestProviders>
  );
}

describe('TagMultiAutocomplete', () => {
  it('preserves filter tag IDs and order while adding and removing tags', async () => {
    const user = userEvent.setup();
    render(<FilterTagPicker />);

    await user.type(
      screen.getByRole('textbox', { name: 'Choose tags' }),
      'cir',
    );
    await user.click(screen.getByRole('button', { name: '#circle' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      '#missing #red #circle',
    );

    await user.click(screen.getByRole('button', { name: '#red' }));
    expect(screen.getByRole('status')).toHaveTextContent('#missing #circle');
  });
});
