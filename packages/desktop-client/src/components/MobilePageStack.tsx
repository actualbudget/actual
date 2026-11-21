import { cloneElement, createContext, use, useState } from 'react';
import type { ReactElement } from 'react';
import { useLocation, useNavigationType } from 'react-router';
import type { Location, NavigationType, RoutesProps } from 'react-router';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { View } from '@actual-app/components/view';

// How many pages are kept alive behind the visible one.
const MAX_HIDDEN_PAGES = 5;

/**
 * Navigation state for links that start a new stack instead of opening a page
 * on top of the current one, like the tabs of the mobile tab bar.
 */
export const NEW_PAGE_STACK_STATE = { isNewPageStack: true } as const;

function isNewPageStack(location: Location) {
  const state: unknown = location.state;
  return (
    typeof state === 'object' &&
    state != null &&
    'isNewPageStack' in state &&
    state.isNewPageStack === true
  );
}

const IsCurrentMobilePageContext = createContext(true);

/**
 * Whether this page is the one being shown, as opposed to one kept alive
 * behind it in the mobile page stack. Always true outside the stack.
 */
export function useIsCurrentMobilePage() {
  return use(IsCurrentMobilePageContext);
}

type StackEntry = {
  // Stays the same when the entry's URL is replaced (e.g. typing a search
  // updates `?search=`), so the page isn't remounted.
  id: string;
  location: Location;
};

type MobilePageStackProps = {
  /** The app's `<Routes>`; rendered once per page in the stack. */
  children: ReactElement<RoutesProps>;
};

/**
 * On mobile, keeps the pages the user navigated through alive instead of
 * unmounting them, like a native navigation stack: opening a page pushes it,
 * going back pops it and shows the previous page exactly as it was left
 * (scroll position, loaded data, search).
 *
 * The pages are stacked on top of each other and all but the top one are
 * made invisible. They stay laid out rather than being removed from layout
 * (`display: none`), so nothing about them - scroll positions included - has
 * to be recalculated when they are shown again: virtualized lists in
 * particular discard and rebuild their layout when hidden that way, which
 * makes the content jump around after going back.
 */
export function MobilePageStack({ children }: MobilePageStackProps) {
  const { isNarrowWidth } = useResponsive();
  const location = useLocation();
  const navigationType = useNavigationType();
  const [stack, setStack] = useState<StackEntry[]>(() => [
    { id: location.key, location },
  ]);

  const top = stack[stack.length - 1];
  if (top.location.key !== location.key) {
    // Update the stack while rendering, so the new page never renders
    // without its stack entry.
    setStack(nextStack(stack, location, navigationType));
  }

  if (!isNarrowWidth) {
    return children;
  }

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {stack.map(entry => {
        const isCurrent = entry.id === top.id;
        return (
          <View
            key={entry.id}
            // Hidden pages can't be focused, tapped or read by screen readers.
            inert={!isCurrent}
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'auto',
              visibility: isCurrent ? 'visible' : 'hidden',
            }}
          >
            <IsCurrentMobilePageContext value={isCurrent}>
              {cloneElement(children, { location: entry.location })}
            </IsCurrentMobilePageContext>
          </View>
        );
      })}
    </View>
  );
}

function nextStack(
  stack: StackEntry[],
  location: Location,
  navigationType: NavigationType,
): StackEntry[] {
  const existingIndex = stack.findIndex(
    entry => entry.location.key === location.key,
  );
  if (existingIndex !== -1) {
    // Back to a page in the stack: drop the pages above it.
    return stack.slice(0, existingIndex + 1);
  }

  if (navigationType === 'REPLACE') {
    const top = stack[stack.length - 1];
    return [...stack.slice(0, -1), { id: top.id, location }];
  }

  if (isNewPageStack(location)) {
    // Keep the page mounted when it's already the only one (e.g. tapping the
    // tab of the page being shown).
    const [first] = stack;
    const isSamePage =
      stack.length === 1 && first.location.pathname === location.pathname;
    return [{ id: isSamePage ? first.id : location.key, location }];
  }

  if (navigationType === 'POP') {
    // Back/forward to a page that isn't in the stack (e.g. after a reload):
    // there is nothing to restore, so start over from it.
    return [{ id: location.key, location }];
  }

  return [...stack, { id: location.key, location }].slice(
    -(MAX_HIDDEN_PAGES + 1),
  );
}
