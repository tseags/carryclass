#!/usr/bin/env bash
# Preview ccw-directory git worktrees (Finder + dev server + quick file checks).
#
# Usage:
#   ./scripts/worktree-preview.sh list
#   ./scripts/worktree-preview.sh signals          # show which trees have "latest" marker files
#   ./scripts/worktree-preview.sh finder <n>       # open folder in Finder (macOS)
#   ./scripts/worktree-preview.sh dev <n> [port]   # next dev (default port 3001, same as npm run dev)
#
# Before switching worktrees: Ctrl+C the running dev server. Only one dev per port.

set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PATHS=()
while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  PATHS+=("${line%% *}")
done < <(git worktree list)

usage() {
  echo "Usage: $0 list | signals | finder <n> | dev <n> [port]" >&2
  echo "  list     — numbered worktrees" >&2
  echo "  signals  — quick check for app-overrides.css + layout link (latest UI cues)" >&2
  echo "  finder n — open worktree #n in Finder" >&2
  echo "  dev n [port] — run: npx next dev -p PORT --webpack (default 3001)" >&2
}

has_file() {
  local dir="$1" f="$2"
  [[ -f "$dir/$f" ]]
}

case "${1:-}" in
  list|"")
    i=1
    while IFS= read -r line; do
      echo "$i  $line"
      i=$((i + 1))
    done < <(git worktree list)
    ;;
  signals)
    i=1
    for target in "${PATHS[@]}"; do
      ao="no"
      lo="no"
      has_file "$target" "public/css/app-overrides.css" && ao="yes"
      if [[ -f "$target/src/app/layout.tsx" ]] && grep -q "app-overrides.css" "$target/src/app/layout.tsx" 2>/dev/null; then
        lo="yes"
      fi
      echo "$i  overrides=$ao  layout-links-overrides=$lo  $target"
      i=$((i + 1))
    done
    echo ""
    echo "Compare in browser after:  ./scripts/worktree-preview.sh dev <n>"
    echo "Then open:  http://localhost:3001/instructors  http://localhost:3001/ca  http://localhost:3001/"
    ;;
  finder)
    n="${2:-}"
    if [[ -z "$n" ]] || ! [[ "$n" =~ ^[0-9]+$ ]]; then
      usage
      exit 1
    fi
    idx=$((n - 1))
    if [[ $idx -lt 0 || $idx -ge ${#PATHS[@]} ]]; then
      echo "Invalid index $n (use 1-${#PATHS[@]})" >&2
      exit 1
    fi
    target="${PATHS[$idx]}"
    echo "Opening Finder: $target"
    open "$target"
    ;;
  dev)
    n="${2:-}"
    port="${3:-3001}"
    if [[ -z "$n" ]] || ! [[ "$n" =~ ^[0-9]+$ ]]; then
      usage
      exit 1
    fi
    if ! [[ "$port" =~ ^[0-9]+$ ]]; then
      echo "Port must be a number" >&2
      exit 1
    fi
    idx=$((n - 1))
    if [[ $idx -lt 0 || $idx -ge ${#PATHS[@]} ]]; then
      echo "Invalid index $n (use 1-${#PATHS[@]})" >&2
      exit 1
    fi
    target="${PATHS[$idx]}"
    if [[ ! -f "$target/package.json" ]]; then
      echo "No package.json in $target" >&2
      exit 1
    fi
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Worktree #$n → $target"
    echo "Dev URL:  http://localhost:${port}"
    echo "Pages to compare:  /  /instructors  /ca  /gear"
    echo "Stop any other server on port ${port} first (Ctrl+C)."
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    cd "$target"
    exec npx next dev -p "$port" --webpack
    ;;
  *)
    usage
    exit 1
    ;;
esac
