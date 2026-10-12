import fs from 'fs';
import path from 'path';

// Electron 43 (Chromium) stopped starting a file dialog in the folder the app
// used last, so the folder now has to be handed to the dialog explicitly.
// Keeping that bookkeeping here leaves it free of Electron and testable.

export function dialogDefaultPath(
  lastDirectory: string | undefined,
  directoryExists: (directory: string) => boolean = fs.existsSync,
): string | undefined {
  if (!lastDirectory) {
    return undefined;
  }
  // The remembered folder may have been renamed, deleted, or be on a drive that
  // is no longer attached. Drop it so the dialog uses its own default instead.
  return directoryExists(lastDirectory) ? lastDirectory : undefined;
}

export function directoryToRemember(
  selection: string[] | undefined,
  properties: string[] = [],
): string | undefined {
  const selected = selection?.[0];
  if (!selected) {
    return undefined;
  }
  // An openDirectory dialog already yields the folder itself.
  return properties.includes('openDirectory')
    ? selected
    : path.dirname(selected);
}
