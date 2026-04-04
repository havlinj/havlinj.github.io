import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: process.cwd(),
  recommendedConfig: true,
});

export default [
  // ignore Astro generated files
  {
    ignores: ['.astro/**/*.d.ts', 'dist/**'],
  },

  // use legacy config via compat layer
  ...compat.extends('eslint:recommended'),
  ...compat.extends('plugin:@typescript-eslint/recommended'),
  ...compat.extends('plugin:astro/recommended'),
  {
    rules: {
      semi: ['error', 'always'],
      'no-unused-vars': 'warn',
    },
  },
];
