module.exports = {
  plugins: ['prettier', 'import'],
  extends: ['react-app'],
  rules: {
    'prettier/prettier': 'error',
    'no-unused-vars': [
      'error',
      {
        args: 'none',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }
    ],
    'no-loop-func': 'off',
    'no-restricted-globals': 'off',

    'import/no-useless-path-segments': 'error',
    'import/order': [
      'error',
      {
        alphabetize: {
          caseInsensitive: true,
          order: 'asc'
        },
        groups: [
          'builtin', // Built-in types are first
          'external',
          'parent',
          'sibling',
          'index' // Then the index file
        ],
        'newlines-between': 'always',
        pathGroups: [
          // Enforce that React (and react-related packages) is the first import
          { group: 'builtin', pattern: 'react?(-*)', position: 'before' },
          // Separate imports from Actual from "real" external imports
          {
            group: 'external',
            pattern: 'loot-{core,design}/**/*',
            position: 'after'
          }
        ],
        pathGroupsExcludedImportTypes: ['react']
      }
    ]
  }
};
