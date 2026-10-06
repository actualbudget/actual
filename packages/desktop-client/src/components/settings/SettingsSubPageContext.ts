import { createContext, useContext } from 'react';

export const SettingsSubPageContext = createContext(false);

/**
 * True when a page is rendered inside the settings layout, next to the
 * settings navigation. Pages with their own header use this to drop it, since
 * the layout already shows one.
 */
export function useIsSettingsSubPage() {
  return useContext(SettingsSubPageContext);
}
