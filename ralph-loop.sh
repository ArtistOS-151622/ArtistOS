#!/usr/bin/env bash
# =============================================================================
# ralph-loop.sh — Autonomous AI Coding Loop for ArtistOS
# =============================================================================
#
# Inspired by the "Ralph Wiggum Loop" pattern (Geoffrey Huntley, 2025).
# Spawns a fresh AI agent instance per task to avoid context rot.
#
# USAGE:
#   ./ralph-loop.sh              # interactive: pick tasks from TODO.md
#   ./ralph-loop.sh --yolo       # autonomous: run all uncompleted tasks
#   ./ralph-loop.sh --task "..."  # run a single inline task
#   ./ralph-loop.sh --dry-run    # show tasks without executing
#
# REQUIREMENTS:
#   - Claude Code CLI installed: npm install -g @anthropic-ai/claude-code
#     (or Gemini CLI / Amp — adjust AGENT_CMD below)
#   - TODO.md in the project root (see format below)
#   - Git repo with a clean working tree recommended
#
# TODO.md FORMAT:
#   Each task is a markdown checkbox line:
#     - [ ] Short task description — detail goes here
#     - [x] Already done task
#     - [/] In-progress (will be skipped)
#
# =============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TODO_FILE="$REPO_ROOT/TODO.md"
PROGRESS_LOG="$REPO_ROOT/.ralph-progress.log"
MAX_LOOPS="${MAX_LOOPS:-50}"          # safety ceiling — won't run more than this
LOOP_DELAY="${LOOP_DELAY:-3}"         # seconds between loops
AGENT_CMD="${AGENT_CMD:-claude}"      # claude | agy | amp

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

# ── Flags ─────────────────────────────────────────────────────────────────────
YOLO=false
DRY_RUN=false
INLINE_TASK=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yolo)      YOLO=true ;;
    --dry-run)   DRY_RUN=true ;;
    --task)      INLINE_TASK="$2"; shift ;;
    --help|-h)
      sed -n '/^# USAGE/,/^# =/p' "$0" | head -n 20
      exit 0 ;;
  esac
  shift
done

# ── Helpers ───────────────────────────────────────────────────────────────────
log() { echo -e "${CYAN}[ralph]${RESET} $*"; }
ok()  { echo -e "${GREEN}[✓]${RESET} $*"; }
err() { echo -e "${RED}[✗]${RESET} $*" >&2; }
warn(){ echo -e "${YELLOW}[!]${RESET} $*"; }

timestamp() { date '+%Y-%m-%d %H:%M:%S'; }

record_progress() {
  local status="$1" task="$2"
  echo "[$(timestamp)] [$status] $task" >> "$PROGRESS_LOG"
}

ensure_todo() {
  if [[ ! -f "$TODO_FILE" ]]; then
    warn "TODO.md not found — creating a starter file."
    cat > "$TODO_FILE" << 'EOF'
# ArtistOS TODO — Ralph Loop Task Queue

> Add tasks as `- [ ] description`. The Ralph Loop picks up unchecked items.

## Backlog

- [ ] Example task — replace this with your real tasks

EOF
    log "Created $TODO_FILE — add your tasks and re-run."
    exit 0
  fi
}

# Extract next uncompleted task from TODO.md
next_task() {
  grep -m1 '^\- \[ \]' "$TODO_FILE" 2>/dev/null | sed 's/^- \[ \] //' || true
}

# Mark a task done in TODO.md
mark_done() {
  local task="$1"
  # Escape special chars for sed
  local escaped
  escaped=$(printf '%s\n' "$task" | sed 's/[[\.*^$()+?{|]/\\&/g')
  sed -i "s/^- \[ \] ${escaped}/- [x] ${escaped}/" "$TODO_FILE"
}

# Mark a task in-progress
mark_in_progress() {
  local task="$1"
  local escaped
  escaped=$(printf '%s\n' "$task" | sed 's/[[\.*^$()+?{|]/\\&/g')
  sed -i "s/^- \[ \] ${escaped}/- [\/] ${escaped}/" "$TODO_FILE"
}

# Reset in-progress back to uncompleted (on failure)
mark_failed() {
  local task="$1"
  local escaped
  escaped=$(printf '%s\n' "$task" | sed 's/[[\.*^$()+?{|]/\\&/g')
  sed -i "s/^- \[\/\] ${escaped}/- [ ] ${escaped} [FAILED]/" "$TODO_FILE"
}

# Build the system prompt injected at the top of every agent invocation
build_prompt() {
  local task="$1"
  cat << PROMPT
You are working on the ArtistOS codebase (Next.js App Router + Supabase + Razorpay).

MANDATORY: Before writing any code, read these files in order:
1. MEMORY.md   — accumulated lessons and project-specific gotchas
2. RULES.md    — non-negotiable coding standards and forbidden actions
3. CLAUDE.md   — architecture overview and non-standard Next.js details

YOUR TASK:
$task

EXECUTION CHECKLIST (complete ALL before finishing):
- [ ] Implement the task according to RULES.md patterns
- [ ] Run: pnpm lint   (fix all lint errors before committing)
- [ ] Stage and commit with a descriptive message
- [ ] Append a one-line summary of what you changed to MEMORY.md under "Lessons Learned" if you discovered something new

DO NOT:
- Create middleware.ts (use proxy.ts)
- Use npm/yarn (use pnpm)
- Call supabase.auth.*
- Hand-name migration files
- Leave console.log in production paths
- Leave the repo in a broken state

When done, output exactly one line: RALPH_TASK_COMPLETE
PROMPT
}

# ── Single task execution ─────────────────────────────────────────────────────
run_task() {
  local task="$1"
  local loop_num="${2:-1}"
  local prompt
  prompt="$(build_prompt "$task")"

  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  log "Loop ${loop_num} | Task: ${BOLD}${task}${RESET}"
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

  if $DRY_RUN; then
    warn "[dry-run] Would execute: $AGENT_CMD --print \"$prompt\""
    return 0
  fi

  mark_in_progress "$task"
  record_progress "START" "$task"

  # Spawn a FRESH agent instance with the task prompt
  local exit_code=0
  if ! echo "$prompt" | "$AGENT_CMD" \
      --print \
      --no-auto-update \
      -p - \
      2>&1; then
    exit_code=$?
  fi

  if [[ $exit_code -ne 0 ]]; then
    err "Agent exited with code $exit_code for task: $task"
    mark_failed "$task"
    record_progress "FAIL" "$task"
    return 1
  fi

  mark_done "$task"
  record_progress "DONE" "$task"
  ok "Task complete: $task"
}

# ── Main loop ─────────────────────────────────────────────────────────────────
main() {
  cd "$REPO_ROOT"

  echo ""
  echo -e "${BOLD}${CYAN}  ██████╗  █████╗ ██╗     ██████╗ ██╗  ██╗${RESET}"
  echo -e "${BOLD}${CYAN}  ██╔══██╗██╔══██╗██║     ██╔══██╗██║  ██║${RESET}"
  echo -e "${BOLD}${CYAN}  ██████╔╝███████║██║     ██████╔╝███████║${RESET}"
  echo -e "${BOLD}${CYAN}  ██╔══██╗██╔══██║██║     ██╔═══╝ ██╔══██║${RESET}"
  echo -e "${BOLD}${CYAN}  ██║  ██║██║  ██║███████╗██║     ██║  ██║${RESET}"
  echo -e "${BOLD}${CYAN}  ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝${RESET}"
  echo -e "${BOLD}         ArtistOS Autonomous Loop v1.0${RESET}"
  echo ""
  log "Agent: $AGENT_CMD | Repo: $REPO_ROOT"
  log "Progress log: $PROGRESS_LOG"
  $YOLO    && warn "--yolo mode: running all tasks without confirmation"
  $DRY_RUN && warn "--dry-run mode: no changes will be made"
  echo ""

  # ── Inline single task mode ──────────────────────────────────────────────
  if [[ -n "$INLINE_TASK" ]]; then
    run_task "$INLINE_TASK" 1
    exit $?
  fi

  # ── File-based loop mode ─────────────────────────────────────────────────
  ensure_todo

  local loop=0
  while true; do
    (( loop++ ))

    if [[ $loop -gt $MAX_LOOPS ]]; then
      warn "Reached MAX_LOOPS=$MAX_LOOPS — stopping for safety."
      break
    fi

    local task
    task="$(next_task)"

    if [[ -z "$task" ]]; then
      ok "All tasks complete! 🎉"
      break
    fi

    if ! $YOLO; then
      echo ""
      echo -e "Next task: ${BOLD}$task${RESET}"
      read -r -p "Execute? [Y/n/q] " confirm
      case "$confirm" in
        [nN]) warn "Skipping."; continue ;;
        [qQ]) log "Quit."; break ;;
        *) : ;;  # Y or enter → proceed
      esac
    fi

    if ! run_task "$task" "$loop"; then
      if ! $YOLO; then
        read -r -p "Task failed. Continue? [Y/n] " cont
        [[ "$cont" =~ ^[nN]$ ]] && break
      fi
    fi

    sleep "$LOOP_DELAY"
  done

  log "Ralph Loop ended after $loop iteration(s)."
}

main "$@"
