import { isAbsolute } from 'node:path';

export async function openExternalUrl(
  value: unknown,
  open: (url: string) => Promise<void>,
): Promise<boolean> {
  if (typeof value !== 'string') {
    return false;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false;
  }
  await open(url.href);
  return true;
}

export function revealLocalFile(
  value: unknown,
  reveal: (path: string) => void,
  isAbsolutePath: (path: string) => boolean = isAbsolute,
): boolean {
  if (
    typeof value !== 'string' ||
    !isAbsolutePath(value) ||
    value.replace(/\\/g, '/').startsWith('//')
  ) {
    return false;
  }
  reveal(value);
  return true;
}
