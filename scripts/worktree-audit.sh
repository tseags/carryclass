#!/usr/bin/env bash
# Compare Desktop repo vs mkx worktree. Prints to terminal AND writes worktree-audit.log on Desktop.
set -u
DESKTOP="/Users/ty/Desktop/ccw-directory"
MKX="/Users/ty/.cursor/worktrees/ccw-directory/mkx"
LOG="$DESKTOP/worktree-audit.log"

run() {
  echo "worktree-audit.sh - comparing Desktop vs mkx"
  echo "(If your terminal looks empty, open: worktree-audit.log)"
  echo ""

  if [[ ! -d "$DESKTOP/.git" ]] && [[ ! -f "$DESKTOP/.git" ]]; then
    echo "ERROR: Not a git repo: $DESKTOP" >&2
    return 1
  fi

  if [[ ! -d "$MKX" ]]; then
    echo "ERROR: mkx worktree not found: $MKX"
    echo "  Run: git worktree list"
    echo "  If mkx was removed, edit MKX= in scripts/worktree-audit.sh"
    return 1
  fi

  echo "=== Git positions ==="
  git -C "$DESKTOP" rev-parse --short HEAD 2>/dev/null || { echo "ERROR: git failed for Desktop" >&2; return 1; }
  git -C "$DESKTOP" branch --show-current 2>/dev/null || true
  printf "mkx: "
  git -C "$MKX" rev-parse --short HEAD 2>/dev/null || echo "(unknown)"
  git -C "$MKX" branch --show-current 2>/dev/null || echo "(detached or error)"

  echo ""
  echo "=== Summary: files only on Desktop (under src/) ==="
  if [[ ! -d "$DESKTOP/src" ]] || [[ ! -d "$MKX/src" ]]; then
    echo "ERROR: missing src/ under Desktop or mkx" >&2
    return 1
  fi
  diff -qr "$DESKTOP/src" "$MKX/src" 2>/dev/null | grep -F "Only in ${DESKTOP}/src" | head -40 || true
  count=$(diff -qr "$DESKTOP/src" "$MKX/src" 2>/dev/null | grep -Fc "Only in ${DESKTOP}/src" || true)
  echo "... ($count Desktop-only path lines)"

  echo ""
  echo "=== Files only in mkx (under src/) ==="
  diff -qr "$DESKTOP/src" "$MKX/src" 2>/dev/null | grep -F "Only in ${MKX}/src" || echo "(none)"

  echo ""
  echo "=== Shared paths that differ (first 25) ==="
  diff -qr "$DESKTOP/src" "$MKX/src" 2>/dev/null | grep -F "Files " | head -25 || true

  echo ""
  echo "=== public/css app-overrides ==="
  test -f "$DESKTOP/public/css/app-overrides.css" && echo "Desktop: YES" || echo "Desktop: NO"
  test -f "$MKX/public/css/app-overrides.css" && echo "mkx: YES" || echo "mkx: NO"

  echo ""
  echo "Done. See also: docs/CONSOLIDATE-WORKTREES.md"
}

{
  run
  echo ""
  echo "---"
  echo "Log file: $LOG"
} 2>&1 | tee "$LOG"
