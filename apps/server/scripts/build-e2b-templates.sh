#!/usr/bin/env bash
# Build and register prebaked E2B templates for Zuno.
# Requires: E2B_API_KEY, e2b CLI (e2b or bunx @e2b/cli).
#
# Aliases (set matching env vars after build):
#   zuno-vite-react-ts  -> E2B_TEMPLATE_REACT_TS
#   zuno-vite-react-js  -> E2B_TEMPLATE_REACT_JS
#   zuno-next-ts        -> E2B_TEMPLATE_NEXT_TS
#   zuno-next-js        -> E2B_TEMPLATE_NEXT_JS
#
# Usage:
#   set -a && source apps/server/.env && set +a
#   ./apps/server/scripts/build-e2b-templates.sh
#   ./apps/server/scripts/build-e2b-templates.sh vite-react-ts

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
E2B_DIR="$ROOT/e2b"

if [[ -z "${E2B_API_KEY:-}" ]]; then
  echo "E2B_API_KEY is not set. Source apps/server/.env first." >&2
  exit 1
fi

if command -v e2b >/dev/null 2>&1; then
  E2B_CMD=(e2b)
elif command -v bunx >/dev/null 2>&1; then
  E2B_CMD=(bunx --bun @e2b/cli)
else
  echo "Install E2B CLI: bun add -g @e2b/cli" >&2
  exit 1
fi

python3 - "$ROOT" <<'PY'
import sys
from pathlib import Path
import shutil, os
server = Path(sys.argv[1])
e2b_root = server / "e2b"
templates = server / "templates"
SKIP = {"node_modules", "dist", ".git", ".vite", ".next", ".DS_Store"}
for folder in ["vite-react-ts", "vite-react-js", "next-ts", "next-js"]:
    src = templates / folder
    dest = e2b_root / folder / "project"
    if not src.exists():
        continue
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    for root, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d not in SKIP]
        rel = Path(root).relative_to(src)
        for name in files:
            if name in SKIP or name == ".DS_Store":
                continue
            out = name[:-4] if name.endswith(".tpl") else name
            target = dest / rel / out
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes((Path(root) / name).read_bytes())
    print(f"restaged {folder}")
PY

alias_for() {
  case "$1" in
    vite-react-ts) echo zuno-vite-react-ts ;;
    vite-react-js) echo zuno-vite-react-js ;;
    next-ts) echo zuno-next-ts ;;
    next-js) echo zuno-next-js ;;
    *) return 1 ;;
  esac
}

env_for() {
  case "$1" in
    vite-react-ts) echo E2B_TEMPLATE_REACT_TS ;;
    vite-react-js) echo E2B_TEMPLATE_REACT_JS ;;
    next-ts) echo E2B_TEMPLATE_NEXT_TS ;;
    next-js) echo E2B_TEMPLATE_NEXT_JS ;;
    *) return 1 ;;
  esac
}

if [[ $# -eq 0 ]]; then
  TARGETS=(vite-react-ts vite-react-js next-ts next-js)
else
  TARGETS=("$@")
fi

echo "Building with: ${E2B_CMD[*]}"
for stack in "${TARGETS[@]}"; do
  dir="$E2B_DIR/$stack"
  name="$(alias_for "$stack")"
  key="$(env_for "$stack")"
  if [[ ! -d "$dir" ]]; then
    echo "Unknown stack: $stack" >&2
    exit 1
  fi
  echo ""
  echo "==> Building $name from $dir"
  (
    cd "$dir"
    "${E2B_CMD[@]}" template create "$name" --dockerfile e2b.Dockerfile
  )
  echo "Set ${key}=${name} in apps/server/.env"
done

echo ""
echo "Done. Restart the server after updating .env."
