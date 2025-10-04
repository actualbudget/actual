import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
  type InputHTMLAttributes,
  type RefObject,
} from 'react';

type InputMode = InputHTMLAttributes<HTMLInputElement>['inputMode'];

type FocusOptions = {
  inputmode: InputMode;
};

type FocusInput = (opts: FocusOptions) => void;

const NavigableFocusFunctionContext = createContext<FocusInput | null>(null);

const NavigableFocusValueContext =
  createContext<RefObject<HTMLInputElement | null> | null>(null);

type ProviderProps = { children: ReactNode };

export function NavigableFocusProvider({ children }: ProviderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputModeRef = useRef<InputMode>('text');
  const [focusedValue, setFocusedValue] = useState('');

  const focusInput = useCallback((opts: FocusOptions) => {
    const el = inputRef.current;
    if (!el) {
      return;
    }
    if (opts?.inputmode) {
      inputModeRef.current = opts.inputmode;
      el.setAttribute('inputmode', opts.inputmode);
    }
    el.value = ''; // Reset previous state
    el.setSelectionRange(0, 0); // Move cursor to start
    el.focus();
  }, []);

  return (
    <NavigableFocusFunctionContext.Provider value={focusInput}>
      <NavigableFocusValueContext.Provider value={inputRef}>
        <input
          data-testid="navigable-focus-input"
          type="text"
          ref={inputRef}
          value={focusedValue}
          inputMode={inputModeRef.current}
          onChange={e => setFocusedValue(e.target.value)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: 'none',
            // Don't zoom in on iOS
            fontSize: '16px',
          }}
          aria-hidden="true"
        />
        {children}
      </NavigableFocusValueContext.Provider>
    </NavigableFocusFunctionContext.Provider>
  );
}

export function useNavigableFocusFunction() {
  const focusInput = useContext(NavigableFocusFunctionContext);
  if (focusInput == null) {
    throw new Error(
      'useNavigableFocusFunction must be used within NavigableFocusFunctionProvider',
    );
  }
  return focusInput;
}

export function useNavigableFocusRef() {
  const ref = useContext(NavigableFocusValueContext);
  if (ref == null) {
    throw new Error(
      'useNavigableFocusRef must be used within NavigableFocusRefProvider',
    );
  }
  return ref;
}
