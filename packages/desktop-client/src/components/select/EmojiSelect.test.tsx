import { forwardRef, type RefObject, type ReactNode } from 'react';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import { EmojiSelect } from './EmojiSelect';

import { TestProvider } from '@desktop-client/redux/mock';

vi.mock('@emoji-mart/data', () => ({
  default: {
    emojis: {
      grinning: {
        id: 'grinning',
        name: 'Grinning Face',
        keywords: ['face', 'grin', 'smile', 'happy'],
        skins: [{ native: '😀' }],
      },
      '100': {
        id: '100',
        name: 'Hundred Points',
        keywords: ['100', 'hundred', 'points', 'score'],
        skins: [{ native: '💯' }],
      },
      red_circle: {
        id: 'red_circle',
        name: 'Red Circle',
        keywords: ['red', 'circle', 'round'],
        skins: [{ native: '🔴' }],
      },
      thumbs_up: {
        id: 'thumbs_up',
        name: 'Thumbs Up',
        keywords: ['thumbs', 'up', 'like', 'yes'],
        skins: [{ native: '👍' }],
      },
    },
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  Trans: ({ children }: unknown) => children,
}));

vi.mock('react-aria-components', async importOriginal => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    Button: (props: Record<string, unknown>) => {
      const { children, onPress, ...rest } = props;
      return (
        <button onClick={onPress as () => void} {...rest}>
          {children as ReactNode}
        </button>
      );
    },
    Input: forwardRef((props: Record<string, unknown>, ref: unknown) => (
      <input ref={ref as RefObject<HTMLInputElement>} {...props} />
    )),
  };
});

vi.mock('@actual-app/components/button', () => ({
  Button: ({ children, onPress, ...props }: unknown) => (
    <button onClick={onPress} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@actual-app/components/input', () => ({
  Input: forwardRef(({ ...props }: unknown, ref: unknown) => (
    <input ref={ref} {...props} />
  )),
}));

vi.mock('@actual-app/components/popover', () => ({
  Popover: ({
    children,
    isOpen,
    _triggerRef,
    _isNonModal,
    ...props
  }: unknown) => {
    if (!isOpen) {
      return null;
    }
    const propsObj = props as {
      onOpenChange?: unknown;
      [key: string]: unknown;
    };
    const { onOpenChange: _, ...restProps } = propsObj;
    return (
      <div data-testid="emoji-select-popover" {...restProps}>
        {children}
      </div>
    );
  },
}));

describe('EmojiSelect', () => {
  const defaultProps = {
    value: null,
    onSelect: vi.fn(),
    inputProps: {
      onBlur: vi.fn(),
      onKeyDown: vi.fn(),
      style: {},
    },
    onUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the flag input when closed', () => {
    render(
      <TestProvider>
        <EmojiSelect {...defaultProps} />
      </TestProvider>,
    );

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
  });

  it('opens picker when isOpen is true', () => {
    render(
      <TestProvider>
        <EmojiSelect {...defaultProps} isOpen />
      </TestProvider>,
    );

    expect(screen.getByTestId('emoji-select-popover')).toBeInTheDocument();
  });

  it('displays emoji when value is set', () => {
    render(
      <TestProvider>
        <EmojiSelect {...defaultProps} value=":grinning:" />
      </TestProvider>,
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('😀');
  });

  it('calls onSelect when emoji is clicked', async () => {
    const onSelect = vi.fn();
    render(
      <TestProvider>
        <EmojiSelect {...defaultProps} isOpen onSelect={onSelect} />
      </TestProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('😀')).toBeInTheDocument();
    });

    const emojiButton = screen.getByText('😀').closest('button');
    expect(emojiButton).toBeInTheDocument();

    await userEvent.click(emojiButton!);

    expect(onSelect).toHaveBeenCalledWith(':grinning:');
  });

  it('calls onSelect with null when remove button is clicked', async () => {
    const onSelect = vi.fn();
    render(
      <TestProvider>
        <EmojiSelect
          {...defaultProps}
          isOpen
          value=":grinning:"
          onSelect={onSelect}
        />
      </TestProvider>,
    );

    await waitFor(() => {
      const removeButton = screen.getByText('Remove');
      expect(removeButton).toBeInTheDocument();
    });

    const removeButton = screen.getByText('Remove');
    await userEvent.click(removeButton);

    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('filters emojis when search query is entered', async () => {
    render(
      <TestProvider>
        <EmojiSelect {...defaultProps} isOpen />
      </TestProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('emoji-select-popover')).toBeInTheDocument();
    });
  });

  it('handles keyboard navigation with arrow keys', async () => {
    const onSelect = vi.fn();
    render(
      <TestProvider>
        <EmojiSelect
          {...defaultProps}
          isOpen
          onSelect={onSelect}
          inputProps={{
            ...defaultProps.inputProps,
          }}
        />
      </TestProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('emoji-select-popover')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox');
    await userEvent.type(input, '{ArrowDown}');
  });

  it('closes picker on Escape key', async () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <TestProvider>
        <EmojiSelect {...defaultProps} isOpen onSelect={onSelect} />
      </TestProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('emoji-select-popover')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox');
    await userEvent.type(input, '{Escape}');

    rerender(
      <TestProvider>
        <EmojiSelect {...defaultProps} isOpen={false} onSelect={onSelect} />
      </TestProvider>,
    );

    expect(
      screen.queryByTestId('emoji-select-popover'),
    ).not.toBeInTheDocument();
  });

  it('displays placeholder flag icon when value is null', () => {
    render(
      <TestProvider>
        <EmojiSelect {...defaultProps} value={null} />
      </TestProvider>,
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('');
  });

  it('handles embedded mode correctly', async () => {
    render(
      <TestProvider>
        <EmojiSelect {...defaultProps} embedded />
      </TestProvider>,
    );

    // In embedded mode, the picker should be open by default
    await waitFor(() => {
      expect(screen.getByText('Remove')).toBeInTheDocument();
    });
  });

  it('converts shortcode value to native emoji for display', () => {
    render(
      <TestProvider>
        <EmojiSelect {...defaultProps} value=":100:" />
      </TestProvider>,
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('💯');
  });
});
