import { render, screen } from '@testing-library/react';

import { Button } from './Button';
import { BigInput, Input } from './Input';
import { Text } from './Text';

// jsdom's getComputedStyle does not evaluate media queries, so the base
// (narrow) values always win there. Responsive steps are asserted
// against the generated stylesheet instead: find the media block and
// check that one of the element's emotion classes declares the expected
// value inside it.

const getStyleText = () =>
  Array.from(document.querySelectorAll('style'))
    .map(style => style.textContent ?? '')
    .join('');

const expectMediaDeclaration = (
  element: Element,
  media: string,
  declaration: string,
) => {
  const cssText = getStyleText();
  const classCandidates = [...element.classList].filter(className =>
    className.startsWith('css-'),
  );
  expect(classCandidates.length).toBeGreaterThan(0);

  // Several emotion classes may carry the same media query, so scan
  // every occurrence of it and check each following rule block.
  let searchFrom = 0;
  let isMatched = false;

  for (;;) {
    const mediaIndex = cssText.indexOf(media, searchFrom);
    if (mediaIndex === -1) {
      break;
    }

    const segment = cssText.slice(mediaIndex);
    const nextMedia = segment.indexOf('@media', 1);
    const block = nextMedia === -1 ? segment : segment.slice(0, nextMedia);

    if (
      classCandidates.some(
        className =>
          block.includes(`.${className}`) && block.includes(declaration),
      )
    ) {
      isMatched = true;
      break;
    }

    searchFrom = mediaIndex + media.length;
  }

  expect(isMatched).toBe(true);
};

describe('Button size', () => {
  it('keeps the legacy look when size is omitted', () => {
    render(<Button>Default</Button>);

    const button = screen.getByRole('button', { name: 'Default' });
    const computed = getComputedStyle(button);

    expect(computed.padding).toBe('5px 10px');
    expect(computed.fontSize).toBe('13px');
  });

  it('applies small size styles', () => {
    render(<Button size="small">Small</Button>);

    const button = screen.getByRole('button', { name: 'Small' });
    const computed = getComputedStyle(button);

    expect(computed.padding).toBe('3px 8px');
    expect(computed.fontSize).toBe('12px');
    expect(computed.minHeight).toBe('24px');
  });

  it('applies extra-large size styles with responsive steps', () => {
    render(<Button size="extra-large">Extra Large</Button>);

    const button = screen.getByRole('button', { name: 'Extra Large' });
    const computed = getComputedStyle(button);

    // Base (narrow): comfortable mobile / tap-target scale.
    expect(computed.fontSize).toBe('17px');
    expect(computed.minHeight).toBe('40px');

    // Steps down at the small and medium breakpoints.
    expectMediaDeclaration(
      button,
      '@media (min-width: 512px)',
      'min-height:36px',
    );
    expectMediaDeclaration(
      button,
      '@media (min-width: 730px)',
      'font-size:16px',
    );
  });

  it('uses uniform padding for bare buttons with an explicit size', () => {
    render(
      <Button size="large" variant="bare">
        Bare
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Bare' });
    const computed = getComputedStyle(button);

    expect(computed.padding).toBe('8px');
    expectMediaDeclaration(button, '@media (min-width: 512px)', 'padding:6px');
  });
});

describe('Text size', () => {
  it('applies no font-size opinion when size is omitted', () => {
    render(<Text data-testid="plain">Plain</Text>);

    const plain = screen.getByTestId('plain');
    const reference = plain.ownerDocument.createElement('span');
    plain.ownerDocument.body.appendChild(reference);

    expect(getComputedStyle(plain).fontSize).toBe(
      getComputedStyle(reference).fontSize,
    );
  });

  it('applies size styles when provided', () => {
    render(<Text size="large">Large text</Text>);

    const text = screen.getByText('Large text');
    const computed = getComputedStyle(text);

    // Base (narrow) value; steps down to 15px from the small breakpoint.
    expect(computed.fontSize).toBe('16px');
    expect(computed.lineHeight).toBe('22px');
    expectMediaDeclaration(text, '@media (min-width: 512px)', 'font-size:15px');
  });
});

describe('Input size', () => {
  it('keeps the legacy look when size is omitted', () => {
    render(<Input placeholder="Default" />);

    const input = screen.getByPlaceholderText('Default');
    const computed = getComputedStyle(input);

    expect(computed.padding).toBe('5px');
    expect(computed.fontSize).toBe('13px');
  });

  it('applies size styles when provided', () => {
    render(<Input size="large" placeholder="Large" />);

    const input = screen.getByPlaceholderText('Large');
    const computed = getComputedStyle(input);

    expect(computed.padding).toBe('8px');
    expect(computed.fontSize).toBe('16px');
    expectMediaDeclaration(input, '@media (min-width: 512px)', 'padding:6px');
  });

  it('keeps the legacy BigInput look when size is omitted', () => {
    render(<BigInput placeholder="Big" />);

    const input = screen.getByPlaceholderText('Big');
    const computed = getComputedStyle(input);

    expect(computed.padding).toBe('10px');
    expect(computed.fontSize).toBe('15px');
    expect(computed.borderStyle).toBe('none');
  });

  it('applies size styles to BigInput while keeping its chrome', () => {
    render(<BigInput size="extra-large" placeholder="Big XL" />);

    const input = screen.getByPlaceholderText('Big XL');
    const computed = getComputedStyle(input);

    expect(computed.padding).toBe('10px');
    expect(computed.fontSize).toBe('17px');
    expect(computed.borderStyle).toBe('none');
    expectMediaDeclaration(input, '@media (min-width: 730px)', 'padding:8px');
  });
});
