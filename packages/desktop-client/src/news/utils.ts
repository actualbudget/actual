import { cmpSemanticVersion } from '#util/versions';

import type { NewsEntry } from './types';

/** Entries published after the given date (all entries when no date is known). */
export function getUnseenEntries(
  entries: NewsEntry[],
  lastSeenDate: string | undefined,
): NewsEntry[] {
  if (!lastSeenDate) {
    return entries;
  }
  return entries.filter(entry => entry.date > lastSeenDate);
}

export function getNewestDate(entries: NewsEntry[]): string | undefined {
  return entries.reduce<string | undefined>(
    (newest, entry) =>
      newest === undefined || entry.date > newest ? entry.date : newest,
    undefined,
  );
}

/**
 * The release the user should be told about: the newest unseen release that
 * they are already running (or newer than the one they're running would be
 * covered by the "update available" notification instead).
 */
export function getReleaseToNotify(
  entries: NewsEntry[],
  clientVersion: string,
  lastSeenDate: string | undefined,
): NewsEntry | undefined {
  return getUnseenEntries(entries, lastSeenDate)
    .filter(
      entry =>
        entry.type === 'release' &&
        entry.version !== undefined &&
        cmpSemanticVersion(entry.version, clientVersion) <= 0,
    )
    .sort((entryA, entryB) => (entryA.date < entryB.date ? 1 : -1))[0];
}
