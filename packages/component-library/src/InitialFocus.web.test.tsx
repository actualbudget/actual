import * as React from 'react';

import { render } from '@testing-library/react';

import { InitialFocus } from './InitialFocus';
import { View } from './View';

describe('InitialFocus', () => {
  it('should focus a text input', async () => {
    const component = render(
      <View>
        <InitialFocus>
          <input type="text" title="focused" />
        </InitialFocus>
        <input type="text" title="unfocused" />
      </View>,
    );

    // This is needed bc of the `setTimeout` in the `InitialFocus` component.
    await new Promise(resolve => setTimeout(resolve, 0));

    const input = component.getByTitle('focused') as HTMLInputElement;
    const unfocusedInput = component.getByTitle(
      'unfocused',
    ) as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    expect(document.activeElement).not.toBe(unfocusedInput);
  });

  it('should focus a textarea', async () => {
    const component = render(
      <View>
        <InitialFocus>
          <textarea title="focused" />
        </InitialFocus>
        <textarea title="unfocused" />
      </View>,
    );

    // This is needed bc of the `setTimeout` in the `InitialFocus` component.
    await new Promise(resolve => setTimeout(resolve, 0));

    const textarea = component.getByTitle('focused') as HTMLTextAreaElement;
    const unfocusedTextarea = component.getByTitle(
      'unfocused',
    ) as HTMLTextAreaElement;
    expect(document.activeElement).toBe(textarea);
    expect(document.activeElement).not.toBe(unfocusedTextarea);
  });

  it('should focus a button', async () => {
    const component = render(
      <View>
        <InitialFocus>
          <button title="focused">Click me</button>
        </InitialFocus>
        <button title="unfocused">Do not click me</button>
      </View>,
    );

    // This is needed bc of the `setTimeout` in the `InitialFocus` component.
    await new Promise(resolve => setTimeout(resolve, 0));

    const button = component.getByTitle('focused') as HTMLButtonElement;
    const unfocusedButton = component.getByTitle(
      'unfocused',
    ) as HTMLButtonElement;
    expect(document.activeElement).toBe(button);
    expect(document.activeElement).not.toBe(unfocusedButton);
  });
});
