import * as Platform from 'loot-core/shared/platform';

export function useIsTestEnv(): boolean {
  return Platform.isPlaywright;
}
