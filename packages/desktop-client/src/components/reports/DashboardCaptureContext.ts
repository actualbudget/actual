import { createContext, useContext } from 'react';

/**
 * True while the dashboard is being rendered for an image/PDF export. Cards
 * use it to render eagerly (instead of waiting to scroll into view) and to
 * skip entrance animations so the capture shows the finished charts.
 */
const DashboardCaptureContext = createContext(false);

export const DashboardCaptureProvider = DashboardCaptureContext.Provider;

export function useIsDashboardCapturing(): boolean {
  return useContext(DashboardCaptureContext);
}
