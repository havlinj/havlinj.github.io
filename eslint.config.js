import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: process.cwd(),
  recommendedConfig: true,
});

export default [
  // přeskočí generovaný Astro kód
  {
    ignores: ['.astro/**/*.d.ts'],
  },

  // zachování starých extends přes compat
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
