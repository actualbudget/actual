import * as Platform from '@actual-app/core/shared/platform';

export function useIsTestEnv(): boolean {
  return Platform.isPlaywright;
}
