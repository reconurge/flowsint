#!/usr/bin/env bash

set -euo pipefail

# Generate a complete handoff bundle for another agent.
# Includes: patch, changed files, function hints, execution checklist, and a ready prompt.

COMMIT_REF="${1:-HEAD}"
OUT_BASE="${2:-handoff}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "[ERROR] This script must run inside a git repository."
  exit 1
fi

if ! git rev-parse "$COMMIT_REF" >/dev/null 2>&1; then
  echo "[ERROR] Invalid commit reference: $COMMIT_REF"
  exit 1
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

COMMIT_SHA="$(git rev-parse --short "$COMMIT_REF")"
COMMIT_SHA_FULL="$(git rev-parse "$COMMIT_REF")"
TS="$(date +%Y%m%d_%H%M%S)"
OUT_DIR="$REPO_ROOT/$OUT_BASE/agent_handoff_${COMMIT_SHA}_${TS}"
mkdir -p "$OUT_DIR"

CHANGED_FILES_FILE="$OUT_DIR/CHANGED_FILES.txt"
PATCH_FILE="$OUT_DIR/PATCH.diff"
COMMIT_DETAILS_FILE="$OUT_DIR/COMMIT_DETAILS.txt"
DIFFSTAT_FILE="$OUT_DIR/DIFFSTAT.txt"
FUNC_HINTS_FILE="$OUT_DIR/MODIFIED_FUNCTIONS.md"
TOOLS_FILE="$OUT_DIR/TOOLS_AND_WORKFLOW.md"
CHECKLIST_FILE="$OUT_DIR/EXECUTION_CHECKLIST.md"
PROMPT_FILE="$OUT_DIR/AGENT_PROMPT.md"
MANIFEST_FILE="$OUT_DIR/MANIFEST.txt"

# 1) Raw git artifacts

git show --name-only --pretty=format: "$COMMIT_REF" | sed '/^$/d' > "$CHANGED_FILES_FILE"
git show "$COMMIT_REF" > "$PATCH_FILE"
git show --stat --summary "$COMMIT_REF" > "$COMMIT_DETAILS_FILE"
git diff --stat "$COMMIT_REF^" "$COMMIT_REF" > "$DIFFSTAT_FILE" || true

# 2) Function / symbol hints for modified files
{
  echo "# Modified Functions / Symbols Hints"
  echo
  echo "Commit: $COMMIT_SHA_FULL"
  echo

  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    echo "## $file"

    # Pull file content from the target commit to avoid local drift.
    if ! git cat-file -e "$COMMIT_REF:$file" 2>/dev/null; then
      echo "- File deleted or unavailable in this commit snapshot."
      echo
      continue
    fi

    case "$file" in
      *.py)
        git show "$COMMIT_REF:$file" \
          | grep -nE '^\s*(async\s+def|def)\s+[A-Za-z_][A-Za-z0-9_]*\s*\(' \
          | sed 's/^/- /' || true
        ;;
      *.ts|*.tsx|*.js|*.jsx)
        git show "$COMMIT_REF:$file" \
          | grep -nE '^\s*(export\s+)?(async\s+)?function\s+[A-Za-z_][A-Za-z0-9_]*\s*\(|^\s*(export\s+)?(const|let|var)\s+[A-Za-z_][A-Za-z0-9_]*\s*=\s*(async\s*)?\([^)]*\)\s*=>|^\s*(export\s+default\s+)?class\s+[A-Za-z_][A-Za-z0-9_]*' \
          | sed 's/^/- /' || true
        ;;
      *)
        echo "- Non-code/support file"
        ;;
    esac

    echo
  done < "$CHANGED_FILES_FILE"
} > "$FUNC_HINTS_FILE"

# 3) Tools + workflow summary
cat > "$TOOLS_FILE" << 'EOF'
# Tools and Workflow Used

## Main tooling touched in this fix stream
- Git: commit, status, log, show, push attempts
- Docker / Docker Compose: service orchestration context
- Frontend build toolchain: Yarn + Vite
- Python ecosystem context: uv, pytest, alembic (project flow)

## Key operational observations
- Frontend build may terminate with exit code 143 under constrained resources.
- Direct push to upstream may fail with HTTP 403 when account lacks write access.
- Fork creation may fail with GitHub integration token scope restrictions.

## Practical implication for next agent
- Validate permissions first before attempting push/PR automation.
- If build is required, run with higher timeout and sufficient memory.
EOF

# 4) Execution checklist for the next agent
cat > "$CHECKLIST_FILE" << 'EOF'
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
EOF

# 5) Ready-to-send prompt for another agent
cat > "$PROMPT_FILE" << EOF
You are receiving a handoff bundle for repository fixes.

## Context
- Repo root: $REPO_ROOT
- Target commit: $COMMIT_SHA_FULL

## Inputs in this bundle
- PATCH: PATCH.diff
- Changed files: CHANGED_FILES.txt
- Function/symbol hints: MODIFIED_FUNCTIONS.md
- Commit metadata: COMMIT_DETAILS.txt
- Diff stat: DIFFSTAT.txt
- Validation checklist: EXECUTION_CHECKLIST.md
- Tools/workflow notes: TOOLS_AND_WORKFLOW.md

## Required actions
1. Review and apply the patch if needed.
2. Validate build/tests according to EXECUTION_CHECKLIST.md.
3. Resolve any build/runtime blockers.
4. Push to remote with write access.
5. Create a PR to main with a concise technical summary.

## Acceptance criteria
- All intended files are present and validated.
- Build/test evidence captured.
- Branch pushed and PR URL produced.
EOF

# 6) Manifest
{
  echo "agent_handoff_bundle"
  echo "commit_ref=$COMMIT_REF"
  echo "commit_sha=$COMMIT_SHA_FULL"
  echo "generated_at=$(date -Iseconds)"
  echo "output_dir=$OUT_DIR"
  echo "files="
  ls -1 "$OUT_DIR"
} > "$MANIFEST_FILE"

# 7) Archive output
ARCHIVE_PATH="${OUT_DIR}.tar.gz"
tar -czf "$ARCHIVE_PATH" -C "$(dirname "$OUT_DIR")" "$(basename "$OUT_DIR")"

echo "[OK] Handoff bundle created: $OUT_DIR"
echo "[OK] Archive created: $ARCHIVE_PATH"
