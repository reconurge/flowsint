# Contributing

Setup instructions live in the [README](./README.md#development-setup). This file covers what to run before committing.

## Before every commit

Run the checks for whatever you touched, not just the file you think is affected. mypy and eslint both regularly surface issues in neighboring files once you touch something they import.

### Python (`flowsint-core`, `flowsint-types`, `flowsint-enrichers`, `flowsint-api`)

From the repo root:

```bash
make lint        # ruff format --check + ruff check (whole repo) + frontend prettier/eslint check
make typecheck    # mypy, ratcheted to files this branch touches vs origin/main
```

Then, for whichever package(s) you changed:

```bash
cd <package> && uv run pytest -q
```

`make lint-fix` applies ruff's safe autofixes, plus `yarn format`/`yarn lint` for the frontend, if `make lint` complains.

### Frontend (`flowsint-app`)

`make lint`/`make lint-fix` from the repo root already cover prettier + eslint for `flowsint-app`. The rest, from `flowsint-app/`:

```bash
npx tsc --noEmit                    # types
npx vitest run                      # unit tests
yarn build                          # full build
```

## What the pre-commit hook does for you

`lint-staged` runs automatically on `git commit` and handles:

- `**/*.py` → `ruff format` + `ruff check --fix`
- `flowsint-app/**/*.{ts,tsx,js,jsx}` → `prettier --write`

It does **not** run mypy, eslint, or any test suite. Those are on you before pushing.

## Why the ratchets

`make typecheck` and the frontend eslint CI job only gate files your branch actually changed, not the whole repo. Both codebases have a real pre-existing backlog (mypy: workspace-wide cross-package imports aren't fully typed yet; eslint: ~100 pre-existing `no-explicit-any` warnings). Gating everything from day one would make every unrelated PR red. Touch a file, and it's expected to pass strict checks; untouched files stay as they are until someone gets to them.

## Commit style

Atomic commits please. one logical change per commit, not a single "fix everything" dump. Write commit messages that explain *why*, not just what changed line-by-line.
