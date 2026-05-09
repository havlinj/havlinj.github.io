import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: process.cwd(),
  recommendedConfig: true,
});

export default [
  // ignore Astro / build / Playwright artifacts (report bundles are minified vendor JS)
  {
    ignores: [
      '.astro/**/*.d.ts',
      'dist/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },

  // use legacy config via compat layer
  ...compat.extends('eslint:recommended'),
  ...compat.extends('plugin:@typescript-eslint/recommended'),
  ...compat.extends('plugin:astro/recommended'),
  {
    rules: {
      semi: ['error', 'always'],
      /* Core rule mis-reports names in TS type positions (e.g. callback params). */
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
    },
  },
];
