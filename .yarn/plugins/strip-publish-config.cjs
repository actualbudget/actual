const APPLIED_FIELDS = [
  'type',
  'main',
  'browser',
  'module',
  'exports',
  'imports',
  'bin',
  'types',
  'typings',
];

module.exports = {
  name: 'strip-publish-config',
  factory: () => ({
    hooks: {
      beforeWorkspacePacking(workspace, rawManifest) {
        const publishConfig = rawManifest.publishConfig;
        if (!publishConfig) {
          return;
        }

        for (const field of APPLIED_FIELDS) {
          delete publishConfig[field];
        }

        if (Object.keys(publishConfig).length === 0) {
          delete rawManifest.publishConfig;
        }
      },
    },
  }),
};
