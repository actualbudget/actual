import { config } from '#load-config';

import { getPathForUserFile } from './paths';
import type { FileId } from './paths';

describe('getPathForUserFile', () => {
  it(
    'accepts a filesystem root as the user files directory',
    { skip: process.platform === 'win32' },
    () => {
      const userFiles = config.get('userFiles');
      config.set('userFiles', '/');
      onTestFinished(() => {
        config.set('userFiles', userFiles);
      });

      expect(getPathForUserFile('abc' as FileId)).toBe('/file-abc.blob');
    },
  );
});
