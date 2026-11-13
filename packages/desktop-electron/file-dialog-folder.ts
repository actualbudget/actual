import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Not kept in global-store.json: the backend owns that file while it runs and
// rewrites it from memory, which would drop or race with a write from here.
const STATE_FILE = 'file-dialog.json';

type FileDialogState = {
  lastFolder?: unknown;
};

function getStatePath(dataDir: string) {
  return path.join(dataDir, STATE_FILE);
}

export async function getLastFileDialogFolder(
  dataDir: string,
): Promise<string | undefined> {
  let state: FileDialogState | null;
  try {
    state = JSON.parse(await readFile(getStatePath(dataDir), 'utf8'));
  } catch {
    return undefined;
  }

  const folder = state?.lastFolder;
  if (typeof folder !== 'string' || !path.isAbsolute(folder)) {
    return undefined;
  }

  try {
    return (await stat(folder)).isDirectory() ? folder : undefined;
  } catch {
    return undefined;
  }
}

export async function rememberFileDialogSelection(
  dataDir: string,
  selectedFiles: string[] | undefined,
) {
  const selectedFile = selectedFiles?.[0];
  if (!selectedFile) {
    return;
  }

  const state: FileDialogState = { lastFolder: path.dirname(selectedFile) };
  await writeFile(getStatePath(dataDir), JSON.stringify(state), 'utf8');
}
