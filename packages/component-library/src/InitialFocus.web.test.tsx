import * as React from 'react';
import { forwardRef, type Ref } from 'react';

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

  it('should select text in an input', async () => {
    const component = render(
      <View>
        <InitialFocus>
          <input type="text" title="focused" defaultValue="Hello World" />
        </InitialFocus>
        <input type="text" title="unfocused" />
      </View>,
    );

    // This is needed bc of the `setTimeout` in the `InitialFocus` component.
    await new Promise(resolve => setTimeout(resolve, 0));

    const input = component.getByTitle('focused') as HTMLInputElement;
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(11); // Length of "Hello World"
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

  it('should focus a custom component with ref forwarding', async () => {
    const CustomInput = forwardRef<HTMLInputElement>((props, ref) => (
      <input type="text" ref={ref} {...props} title="focused" />
    ));
    CustomInput.displayName = 'CustomInput';

    const component = render(
      <View>
        <InitialFocus>
          {node => <CustomInput ref={node as Ref<HTMLInputElement>} />}
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
});
