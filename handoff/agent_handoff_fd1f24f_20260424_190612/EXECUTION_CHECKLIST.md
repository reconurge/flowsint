# Execution Checklist for Next Agent

## A) Apply / inspect changes
1. Review `PATCH.diff`.
2. Optionally apply patch on target branch if not already present.
3. Verify changed files in `CHANGED_FILES.txt`.

## B) Validate locally
1. Frontend build:
   - `cd flowsint-app && yarn build`
2. Python tests as needed:
   - `cd flowsint-types && pytest -q`
   - `cd flowsint-core && pytest -q`
3. API sanity (if stack is up):
   - health endpoint and auth endpoints

## C) Git operations
1. Ensure correct branch naming policy.
2. Commit with clear message.
3. Push to writable remote.
4. Open PR to `main` with summary and validation notes.

## D) Permissions gate
- If `git push` fails with 403:
  - Use account with write access, or
  - push to a fork and open PR from fork branch.
