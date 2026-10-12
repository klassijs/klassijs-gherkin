import stylistic from '@stylistic/eslint-plugin'
import babelParser from '@babel/eslint-parser'

export default [
  {
    files: ['src/**/*.ts'],
    plugins: {
      '@stylistic': stylistic,
    },
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          babelrc: false,
          configFile: false,
          parserOpts: {
            plugins: ['typescript'],
          },
        },
      },
      ecmaVersion: 12,
      sourceType: 'module',
    },
    rules: {
      '@stylistic/eol-last': 'warn',
      '@stylistic/max-len': ['warn', { code: 100 }],
      '@stylistic/comma-dangle': ['warn', 'always-multiline'],
      'class-methods-use-this': 'off',
    },
  },
]
