# Versioning & Changelog Guide

This document explains how versioning and changelog management works in Flowsint.

## Overview

Flowsint uses **Conventional Commits** and automated tooling to manage versions and generate changelogs:

- **Commitizen** - Interactive commit message helper
- **Commitlint** - Validates commit messages
- **Standard-Version** - Automatic versioning and changelog generation
- **Husky** - Git hooks for enforcing conventions

## Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat:` - New feature (MINOR version bump)
- `fix:` - Bug fix (PATCH version bump)
- `perf:` - Performance improvement
- `refactor:` - Code refactoring
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc)
- `test:` - Adding or updating tests
- `build:` - Build system changes
- `ci:` - CI/CD changes
- `chore:` - Other changes
- `revert:` - Revert previous commit

### Breaking Changes

Add `BREAKING CHANGE:` in the footer or `!` after type to trigger a MAJOR version bump:

```
feat!: remove legacy API endpoints

BREAKING CHANGE: The /v1/ endpoints have been removed.
```

## Making Commits

### Option 1: Interactive (Recommended)

Use Commitizen for an interactive prompt:

```bash
# From root directory
yarn commit

# Or from flowsint-app directory
cd flowsint-app
yarn commit
```

### Option 2: Manual

Write commits manually following the format:

```bash
git commit -m "feat(api): add user authentication endpoint"
```

Commitlint will validate your message via the pre-commit hook.

## Creating Releases

### Automatic Version Bump

Let standard-version determine the version based on commits:

```bash
# Always run from root directory
yarn release
```

This will:
1. Analyze commits since last release
2. Determine version bump (major/minor/patch)
3. Update version in `package.json` and `pyproject.toml`
4. Generate/update `CHANGELOG.md`
5. Create a git commit and tag

### Manual Version Bump

Specify the version bump explicitly:

```bash
# Patch release (0.1.0 → 0.1.1)
yarn release:patch

# Minor release (0.1.0 → 0.2.0)
yarn release:minor

# Major release (0.1.0 → 1.0.0)
yarn release:major
```

### First Release

For the initial release:

```bash
yarn release:first
```

## After Creating a Release

1. **Review the changes**: Check `CHANGELOG.md` and version numbers
2. **Push to remote**:
   ```bash
   git push --follow-tags origin main
   ```

## Version Synchronization

Versions are automatically synchronized across:
- `flowsint-app/package.json`
- `pyproject.toml`

The `scripts/sync-versions.js` script handles this synchronization.

## Manual Version Sync

If you need to manually sync versions:

```bash
yarn sync-version 1.2.3
```

## Workflow Examples

### Example 1: Adding a New Feature

```bash
# Make your changes
git add .

# Interactive commit
yarn commit
# Select: feat
# Scope: graph
# Description: add force-directed layout

# Create release
yarn release

# Push
git push --follow-tags origin main
```

### Example 2: Multiple Commits Before Release

```bash
# Commit 1
git commit -m "feat(ui): add dark mode toggle"

# Commit 2
git commit -m "fix(api): resolve connection timeout issue"

# Commit 3
git commit -m "docs: update API documentation"

# Create release (automatically determines version)
yarn release

# Result: Minor version bump (due to 'feat' commit)
# CHANGELOG.md includes all commits grouped by type

# Push
git push --follow-tags origin main
```

### Example 3: Breaking Change

```bash
# Make breaking changes
git add .

# Commit with breaking change
git commit -m "feat!: redesign authentication system

BREAKING CHANGE: Old auth tokens are no longer valid. Users must re-authenticate."

# Create release
yarn release

# Result: Major version bump
# CHANGELOG.md includes breaking change notice

# Push
git push --follow-tags origin main
```

## Configuration Files

- `.versionrc.json` - Standard-version configuration
- `commitlint.config.js` - Commit message rules
- `.husky/commit-msg` - Git hook for commit validation
- `scripts/sync-versions.js` - Version synchronization script
- `scripts/pyproject-updater.js` - Custom updater for pyproject.toml

## Troubleshooting

### Commit Message Rejected

If your commit is rejected by commitlint:

1. Check the error message for details
2. Follow the conventional commit format
3. Use `yarn commit` for guided commit creation

### Version Out of Sync

If versions are out of sync:

```bash
yarn sync-version <version>
```

### Incorrect Version Bump

If standard-version chose the wrong version:

1. Delete the tag: `git tag -d v1.2.3`
2. Reset the commit: `git reset HEAD~1`
3. Use explicit version: `yarn release:patch` (or minor/major)

## Best Practices

1. **Commit Often**: Make small, focused commits
2. **Use Commitizen**: Interactive prompts help ensure correct format
3. **Test Before Release**: Run tests before creating a release
4. **Review CHANGELOG**: Check generated changelog before pushing
5. **Meaningful Scopes**: Use consistent scope names (e.g., `api`, `ui`, `core`)
6. **Clear Descriptions**: Write descriptive commit messages
7. **Document Breaking Changes**: Always explain breaking changes in detail

## References

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Standard-Version](https://github.com/conventional-changelog/standard-version)
- [Commitizen](https://github.com/commitizen/cz-cli)
- [Commitlint](https://commitlint.js.org/)
