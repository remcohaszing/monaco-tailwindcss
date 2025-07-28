import { define } from '@remcohaszing/eslint'

export default define([
  {
    rules: {
      'import-x/no-extraneous-dependencies': 'off',
      'jsdoc/require-jsdoc': 'off',
      'unicorn/prefer-global-this': 'off'
    }
  },
  {
    files: ['examples/esbuild-demo/build.js'],
    rules: {
      'no-console': 'off'
    }
  }
])
