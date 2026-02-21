import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'vue/multi-word-component-names': 'off',
      // BlockFormEditor intentionally mutates a deep prop object (v-model pattern)
      // — fix is tracked separately as part of the BlockFormEditor extraction refactor
      'vue/no-mutating-props': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
]
