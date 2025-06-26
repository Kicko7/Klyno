const config = require('@lobehub/lint').eslint;

config.extends.push('plugin:@next/next/recommended');

config.rules['unicorn/no-negated-condition'] = 0;
config.rules['unicorn/prefer-type-error'] = 0;
config.rules['unicorn/prefer-logical-operator-over-ternary'] = 0;
config.rules['unicorn/no-null'] = 0;
config.rules['unicorn/no-typeof-undefined'] = 0;
config.rules['unicorn/explicit-length-check'] = 0;
config.rules['unicorn/prefer-code-point'] = 0;
config.rules['no-extra-boolean-cast'] = 0;
config.rules['unicorn/no-useless-undefined'] = 0;
config.rules['react/no-unknown-property'] = 0;
config.rules['unicorn/prefer-ternary'] = 0;
config.rules['unicorn/prefer-spread'] = 0;
config.rules['unicorn/catch-error-name'] = 0;
config.rules['unicorn/no-array-for-each'] = 0;
config.rules['unicorn/prefer-number-properties'] = 0;
config.rules['unicorn/prefer-query-selector'] = 0;
config.rules['unicorn/no-array-callback-reference'] = 0;
// FIXME: Linting error in src/app/[variants]/(main)/chat/features/Migration/DBReader.ts, the fundamental solution should be upgrading typescript-eslint
config.rules['@typescript-eslint/no-useless-constructor'] = 0;
// Disable unused variable warnings for intentionally unused parameters
config.rules['@typescript-eslint/no-unused-vars'] = [
  'error',
  {
    argsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
  },
];
// Disable unreachable code warnings
config.rules['no-unreachable'] = 0;
// Allow unused imports to be cleaned up automatically
config.rules['unused-imports/no-unused-vars'] = [
  'warn',
  {
    argsIgnorePattern: '^_',
    caughtErrorsIgnorePattern: '^_',
    varsIgnorePattern: '^_',
  },
];

config.overrides = [
  {
    extends: ['plugin:mdx/recommended'],
    files: ['*.mdx'],
    rules: {
      '@typescript-eslint/no-unused-vars': 1,
      'no-undef': 0,
      'react/jsx-no-undef': 0,
      'react/no-unescaped-entities': 0,
    },
    settings: {
      'mdx/code-blocks': false,
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      
      '@typescript-eslint/explicit-function-return-type': 'off',
      
'@typescript-eslint/explicit-module-boundary-types': 'off',
      // Ensure strict typing
'@typescript-eslint/no-explicit-any': 'warn',
      // Allow unused variables that start with underscore
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      // Auto-remove unused imports
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-vars': 'off',
    },
  },
  {
    files: ['**/migrations/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-vars': 'off',
    },
  },
];

module.exports = config;
