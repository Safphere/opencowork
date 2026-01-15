module.exports = {
  root: true,
  env: { browser: true, es2020: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'dist-electron', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    // Disabled: Project uses pattern of re-exporting hooks from context files
    'react-refresh/only-export-components': 'off',
    // Relax any type to warning - these are commonly used in IPC communication
    '@typescript-eslint/no-explicit-any': 'warn',
    // Allow unused variables with underscore prefix
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    // Allow namespace declarations for Electron type extensions
    '@typescript-eslint/no-namespace': 'off',
    // Allow useless escape in regex patterns
    'no-useless-escape': 'warn',
    // Allow extra semicolons as warn
    'no-extra-semi': 'warn',
  },
}
