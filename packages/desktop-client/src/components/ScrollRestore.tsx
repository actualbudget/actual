import React, {
  type ReactNode,
  type RefObject,
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { useLocation } from 'react-router-dom';

import { useNavigate } from '@desktop-client/hooks/useNavigate';

import debounce from 'debounce';

type ScrollPosition = {
  x: number;
  y: number;
};

type ScrollRestoreContextValue = {
  registerScrollElement: (key: string, element: HTMLElement) => () => void;
  navigate: ReturnType<typeof useNavigate>;
};

const ScrollRestoreContext = createContext<ScrollRestoreContextValue | undefined>(undefined);

type ScrollRestoreProviderProps = {
  children: ReactNode;
};

export function ScrollRestoreProvider({ children }: ScrollRestoreProviderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const scrollElements = useRef<Map<string, HTMLElement>>(new Map());
  const originalNavigate = useRef(navigate);

  // Update navigate ref when it changes
  useEffect(() => {
    originalNavigate.current = navigate;
  }, [navigate]);

  // Create a custom navigate function that saves scroll positions before navigating
  const enhancedNavigate = useCallback((to: any, options: any = {}) => {
    // Get current scroll positions
    const scrollPositions: Record<string, ScrollPosition> = {};
    scrollElements.current.forEach((element, key) => {
      scrollPositions[key] = {
        x: element.scrollLeft,
        y: element.scrollTop,
      };
    });

    // If we have scroll positions, update the current location state
    if (Object.keys(scrollPositions).length > 0) {
      // First, update current location with scroll positions
      originalNavigate.current(location.pathname + location.search, {
        replace: true,
        state: {
          ...location.state,
          scrollPositions,
        },
      });
    }

    // Then navigate to the new location
    originalNavigate.current(to, options);
  }, [location, originalNavigate]);

  // Restore scroll positions when coming to a page
  useEffect(() => {
    const savedPositions = location.state?.scrollPositions;
    
    if (!savedPositions || typeof savedPositions !== 'object') {
      return;
    }

    let attemptCount = 0;
    const maxAttempts = 20; // Allow more attempts for loading states
    
    const restoreScrollPositions = () => {
      attemptCount++;
      
      // Check if we have any registered elements that match the saved positions
      const savedKeys = Object.keys(savedPositions as Record<string, ScrollPosition>);
      const hasRegisteredElements = savedKeys.some(key => scrollElements.current.has(key));
      
      if (!hasRegisteredElements) {
        if (attemptCount < maxAttempts) {
          // Elements not registered yet, try again with increasing delay for loading states
          const delay = attemptCount < 5 ? 50 : attemptCount < 10 ? 150 : 300;
          setTimeout(restoreScrollPositions, delay);
        }
        return;
      }

      // Wait for next frame to ensure elements are fully rendered
      requestAnimationFrame(() => {
        Object.entries(savedPositions as Record<string, ScrollPosition>).forEach(([key, position]) => {
          const element = scrollElements.current.get(key);
          if (element && typeof position === 'object' && 'x' in position && 'y' in position) {
            element.scrollTo(position.x, position.y);
          }
        });
      });
    };

    // Start restoration after a small delay to allow initial mounting
    const timeoutId = setTimeout(restoreScrollPositions, 10);
    return () => clearTimeout(timeoutId);
  }, [location.state?.scrollPositions]);

  const registerScrollElement = useCallback((key: string, element: HTMLElement) => {
    scrollElements.current.set(key, element);
    
    return () => {
      scrollElements.current.delete(key);
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      registerScrollElement,
      navigate: enhancedNavigate,
    }),
    [registerScrollElement, enhancedNavigate],
  );

  return (
    <ScrollRestoreContext.Provider value={contextValue}>
      {children}
    </ScrollRestoreContext.Provider>
  );
}

type ScrollRestoreProps = {
  scrollKey?: string;
  children: ReactNode;
};

export function ScrollRestore({ scrollKey = 'default', children }: ScrollRestoreProps) {
  const context = useContext(ScrollRestoreContext);
  const scrollElementRef = useRef<HTMLElement>(null);

  if (!context) {
    throw new Error('ScrollRestore must be used within a ScrollRestoreProvider');
  }

  const { registerScrollElement } = context;

  useEffect(() => {
    const element = scrollElementRef.current;
    if (element) {
      return registerScrollElement(scrollKey, element);
    }
  }, [registerScrollElement, scrollKey]);

  // Clone the child element and add ref
  const childElement = React.Children.only(children) as React.ReactElement<any>;
  
  return React.cloneElement(childElement, {
    innerRef: (ref: HTMLElement) => {
      scrollElementRef.current = ref;
      
      // Call original innerRef if it exists
      const originalRef = childElement.props.innerRef;
      if (typeof originalRef === 'function') {
        originalRef(ref);
      } else if (originalRef && typeof originalRef === 'object') {
        (originalRef as RefObject<HTMLElement>).current = ref;
      }
    },
  });
}

export function useScrollRestore() {
  const context = useContext(ScrollRestoreContext);
  if (!context) {
    throw new Error('useScrollRestore must be used within a ScrollRestoreProvider');
  }
  return context;
} 