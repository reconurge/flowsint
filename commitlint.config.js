export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation only changes
        'style',    // Code style changes (formatting, etc)
        'refactor', // Code refactoring
        'perf',     // Performance improvements
        'test',     // Adding or updating tests
        'build',    // Build system or dependencies
        'ci',       // CI/CD changes
        'chore',    // Other changes that don't modify src
        'revert',   // Revert previous commit
      ],
    ],
    'scope-case': [2, 'always', 'kebab-case'],
    'subject-case': [0], // Allow any case for subject
  },
};
