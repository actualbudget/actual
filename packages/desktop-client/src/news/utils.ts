import { cmpSemanticVersion } from '#util/versions';

import type { NewsEntry } from './types';

type ReleaseEntry = NewsEntry & { type: 'release'; version: string };

function isRelease(entry: NewsEntry): entry is ReleaseEntry {
  return entry.type === 'release' && entry.version !== undefined;
}

/**
 * Entries published after the date the user last looked at the feed. Until a
 * baseline date exists (first run) nothing counts as unseen, so a new user
 * isn't greeted with a backlog of "unread" history.
 */
export function getUnseenEntries(
  entries: NewsEntry[],
  lastSeenDate: string | undefined,
): NewsEntry[] {
  if (!lastSeenDate) {
    return [];
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
 * The release to tell the user about: the newest unseen release they are
 * already running. Releases newer than the client are left to the existing
 * "update available" notification.
 */
export function getReleaseToNotify(
  entries: NewsEntry[],
  clientVersion: string,
  lastSeenDate: string | undefined,
): ReleaseEntry | undefined {
  return getUnseenEntries(entries, lastSeenDate)
    .filter(isRelease)
    .filter(entry => cmpSemanticVersion(entry.version, clientVersion) <= 0)
    .sort((entryA, entryB) => (entryA.date < entryB.date ? 1 : -1))[0];
}
