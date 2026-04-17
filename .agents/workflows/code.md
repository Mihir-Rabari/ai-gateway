---
description: Antigravity does NOT write code. It analyzes, decomposes, dispatches, monitors, reviews, and keeps every agent unblocked. Every agent ships real production code on every run. Complexity determines assignment — not role.
---

## The Agent Roster

| Agent | Invoke Style | Complexity | PR Mention |
|-------|-------------|------------|------------|
| **Codex** | `codex exec "..."` | small | `@codex` |
| **GitHub Copilot Agent** | `gh issue edit N --add-assignee "@copilot"` | small → medium | `@copilot` |
| **Jules** | `jules new --parallel N "..."` | small → medium (parallel) | `@jules` |
| **Gemini CLI** | `gemini -p "..."` | medium → large | `@gemini` |
| **Claude Code** | `claude -p "..."` (behind proxy) | large | comment on PR + re-run |

**Hard rule:** Every agent writes real production code. No agent is ever assigned docs-only, research-only, or placeholder work. If the complexity is real, the output must be real.

---

## Model Selection for Claude Code

Before running Claude Code, pick the right model for the task. This is set automatically in `.claude/settings.json`.

### Available Models (via copilot-api proxy)

```
## Frontier — use for large / architectural tasks
claude-opus-4.6
gpt-5.4
gpt-5.2-codex          # deep code generation
gpt-5.3-codex          # deep code generation (alt)
gemini-3.1-pro-preview
gemini-2.5-pro
gpt-5.1
grok-code-fast-1

## Balanced — use for medium tasks
claude-sonnet-4.6
claude-sonnet-4.5
gpt-4.1
gpt-4.1-2025-04-14
gpt-4o-2024-11-20
gpt-5.2
goldeneye-free-auto

## Fast — use for small tasks, quick iterations, code review
claude-haiku-4.5
gpt-4o-mini
gpt-5.4-mini
gpt-5-mini
gemini-3-flash-preview
gpt-4o-mini-2024-07-18

## Specialized
oswe-vscode-prime       # security / vuln focused
minimax-m2.5            # very long context
gpt-41-copilot          # copilot-optimized

## MSft Router pool — load-balanced, great for parallel Claude Code runs
accounts/msft/routers/mp3yn0h7
accounts/msft/routers/yaqq2gxh
accounts/msft/routers/f185i3v4
accounts/msft/routers/fmfeto88
accounts/msft/routers/gdjv4v2v
```

### Automatic Model Selection

```bash
pick_model() {
  local complexity=$1
  local task_type=${2:-"general"}

  case "$complexity" in
    small)
      echo "claude-haiku-4.5"
      ;;
    medium)
      [[ "$task_type" == "security" ]] && echo "oswe-vscode-prime" || echo "claude-sonnet-4.6"
      ;;
    large)
      case "$task_type" in
        codegen)      echo "gpt-5.2-codex" ;;
        architecture) echo "claude-opus-4.6" ;;
        security)     echo "oswe-vscode-prime" ;;
        longcontext)  echo "minimax-m2.5" ;;
        *)            echo "gpt-5.4" ;;
      esac
      ;;
    review)
      echo "claude-sonnet-4.6"
      ;;
    *)
      echo "claude-sonnet-4.6"
      ;;
  esac
}
```

---

## Phase 0 — Detect Input Mode

```bash
detect_mode() {
  local input="$1"
  if echo "$input" | grep -qiE "open issues|existing issues|check issues|work on issues"; then
    echo "issues"
  else
    echo "plan"
  fi
}

fetch_open_issues() {
  gh issue list \
    --state open \
    --assignee "" \
    --json number,title,body,labels,comments,createdAt \
    | jq 'sort_by(.createdAt)'
}
```

---

## Phase 1 — Analyze & Decompose

### Complexity Tiers

| Tier | Scope | LOC Changed | Best Agents |
|------|-------|-------------|-------------|
| `small` | 1 file, clear spec, no side effects | < 100 | Codex / Copilot / Jules |
| `medium` | 2–5 files, some cross-cutting logic | 100–500 | Jules parallel / Gemini CLI |
| `large` | 5+ files, architectural, multi-system | 500+ | Claude Code + Gemini analysis |

### Decomposition Rules

- Each task must be independently mergeable without breaking `main`
- If two tasks touch the same file → assign to the SAME agent, or serialize them
- Identify shared files upfront — never let two concurrent agents own the same file
- Use Gemini CLI to do decomposition when the plan is complex:

```bash
DECOMPOSED=$(gemini --yolo -p "Decompose this task into 3-6 independent GitHub issues.
Output ONLY a valid JSON array. Each item: { title, area, complexity, affected_files[], description }

Task: $USER_INPUT")
```

---

## Phase 2 — Conflict Prevention Map

Before dispatching any agents, build a file ownership map.

```bash
build_ownership_map() {
  echo "=== FILE OWNERSHIP MAP ==="
  # Parse affected_files from all issue bodies
  gh issue list --state open --json number,body | \
    jq -r '.[] | .body' | \
    grep -oE '`[^`]+\.(ts|py|go|js|rs|rb|java)`' | \
    sort | uniq -c | sort -rn

  echo ""
  echo "Files with count > 1 = CONFLICT RISK → assign to single agent or serialize"
}
```

**Golden Rules — enforced on every dispatch:**
```
1. Always git pull main fresh before creating any branch
2. Branch naming: agent/<agent-name>/issue-<N>-<slug>
3. Push branch to remote immediately after creation
4. Never two agents on the same file simultaneously
5. Rebase on main before opening any PR
6. PRs merged in dependency order — if A needs B, merge B first
7. Zero direct commits to main. Ever.
```

---

## Phase 3 — Create GitHub Issues

```bash
create_issue() {
  local title="$1" area="$2" complexity="$3"
  local affected_files="$4" body="$5" agent="$6"

  gh issue create \
    --title "[$area] $title" \
    --body "## What to build
$body

## Acceptance Criteria
- [ ] Implementation complete and functional
- [ ] All existing tests still pass
- [ ] New tests cover the new behavior
- [ ] No linting errors
- [ ] Branch rebased on latest main before PR

## Affected Files
$affected_files

## Complexity
$complexity

## Assigned Agent
$agent

## Implementation Notes
- Follow existing patterns in this codebase
- Do NOT touch files outside 'Affected Files' above
- Branch: agent/${agent}/issue-N-$(echo $title | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | cut -c1-30)
- Always open a PR — never commit to main
- PR body must contain 'closes #N'" \
    --label "complexity:${complexity},area:${area},agent:${agent},status:ready"

  gh issue list --limit 1 --json number | jq '.[0].number'
}
```

---

## Phase 4 — Proxy & Settings Setup (Claude Code)

Run once per session before any Claude Code dispatch.

```bash
setup_claude_code() {
  local complexity="${1:-medium}"
  local task_type="${2:-general}"
  local model
  model=$(pick_model "$complexity" "$task_type")

  echo "→ Claude Code model: $model"

  mkdir -p .claude
  cat > .claude/settings.json <<EOF
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://localhost:4141",
    "ANTHROPIC_AUTH_TOKEN": "dummy",
    "ANTHROPIC_MODEL": "$model",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "$model",
    "ANTHROPIC_SMALL_FAST_MODEL": "claude-haiku-4.5",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "claude-haiku-4.5",
    "DISABLE_NON_ESSENTIAL_MODEL_CALLS": "1",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1"
  },
  "permissions": {
    "deny": ["WebSearch"]
  }
}
EOF

  if ! curl -s http://localhost:4141/health > /dev/null 2>&1; then
    echo "→ Starting copilot-api proxy..."
    npx copilot-api@latest start &
    PROXY_PID=$!
    sleep 4
    echo "→ Proxy up (PID: $PROXY_PID)"
  else
    echo "→ Proxy already running ✓"
  fi
}
```

---

## Phase 5 — Dispatch Agents

### Pre-dispatch (run for EVERY agent before any work)

```bash
pre_dispatch() {
  local issue_num="$1" agent_name="$2" slug="$3"

  git checkout main
  git pull origin main

  BRANCH="agent/${agent_name}/issue-${issue_num}-${slug}"
  git checkout -b "$BRANCH"
  git push -u origin "$BRANCH"   # claim the branch immediately

  echo "→ Branch $BRANCH ready ✓"
  echo "$BRANCH"
}
```

---

### Codex — Small tasks, surgical precision

```bash
dispatch_codex() {
  local issue_num="$1" slug="$2" instruction="$3"
  BRANCH=$(pre_dispatch "$issue_num" "codex" "$slug")

  codex exec "Issue #${issue_num} | Branch: ${BRANCH}

${instruction}

RULES:
- Work only in files listed in the issue
- Do not touch main
- Do not touch other agents' branches
- Commit: git add -A && git commit -m 'feat: #${issue_num} [codex]'"

  git add -A
  git commit -m "feat: #${issue_num} [codex]" || true
  git fetch origin main && git rebase origin/main
  git push origin "$BRANCH"

  gh pr create \
    --title "feat: ${slug} (closes #${issue_num})" \
    --body "Resolves #${issue_num}

## Agent
@codex

## Diff stats
$(git diff main --stat)

## Checklist
- [ ] Acceptance criteria met
- [ ] No unintended changes" \
    --base main --head "$BRANCH"

  echo "→ Codex PR opened for #${issue_num} ✓"
}
```

---

### GitHub Copilot Agent — GitHub-native, full issue context

```bash
dispatch_copilot() {
  local issue_num="$1" slug="$2"

  gh issue comment "$issue_num" --body "@copilot Please implement this issue.

Requirements:
- Create branch: agent/copilot/issue-${issue_num}-${slug}
- Do NOT commit to main under any circumstances
- Open a PR with 'closes #${issue_num}' in the body
- Modify ONLY files listed in 'Affected Files' section
- All tests must pass before opening the PR"

  gh issue edit "$issue_num" \
    --add-assignee "@copilot" \
    --add-label "status:in-progress"

  echo "→ Copilot assigned to #${issue_num} ✓"
}
```

---

### Jules — Parallel execution, multiple issues simultaneously

```bash
dispatch_jules() {
  local issue_num="$1" slug="$2" task="$3"
  local parallel="${4:-1}"
  local repo="${5:-$(gh repo view --json nameWithOwner -q '.nameWithOwner')}"

  if [[ "$parallel" -gt 1 ]]; then
    jules new --repo "$repo" --parallel "$parallel" \
      "Issue #${issue_num} | Branch: agent/jules/issue-${issue_num}-${slug}

${task}

RULES:
- Create and work on branch: agent/jules/issue-${issue_num}-${slug}
- Never commit to main
- Open a PR: closes #${issue_num}"
  else
    gh issue view "$issue_num" --json title,body \
      | jq -r '"Issue #'${issue_num}': " + .title + "\n\n" + .body' \
      | jules new --repo "$repo"
  fi

  gh issue edit "$issue_num" --add-label "status:in-progress"
  echo "→ Jules dispatched for #${issue_num} (parallel: ${parallel}) ✓"
}

# Batch — one Jules session per issue number
dispatch_jules_batch() {
  local repo="${1:-$(gh repo view --json nameWithOwner -q '.nameWithOwner')}"
  shift
  for issue_num in "$@"; do
    gh issue view "$issue_num" --json title,body \
      | jq -r '"Issue #'${issue_num}': " + .title + "\n\n" + .body' \
      | jules new --repo "$repo"
    echo "→ Jules session for #${issue_num} started"
    sleep 1
  done
}

# Power combo: Gemini picks the hardest issue → Jules executes
gemini_to_jules() {
  local repo="${1:-$(gh repo view --json nameWithOwner -q '.nameWithOwner')}"
  ISSUE_LIST=$(gh issue list --state open --json number,title,body --limit 20)
  gemini --yolo -p "Find the most complex unimplemented issue. Output ONLY its title and body verbatim:
${ISSUE_LIST}" | jules new --repo "$repo"
  echo "→ Gemini→Jules power dispatch ✓"
}
```

---

### Gemini CLI — Medium to large, broad codebase reasoning

```bash
dispatch_gemini() {
  local issue_num="$1" slug="$2" complexity="$3"
  BRANCH=$(pre_dispatch "$issue_num" "gemini" "$slug")

  ISSUE_BODY=$(gh issue view "$issue_num" --json title,body \
    | jq -r '.title + "\n\n" + .body')

  CODEBASE=$(find src lib app api -name "*.ts" -o -name "*.py" -o -name "*.go" \
    2>/dev/null | head -20 | xargs cat 2>/dev/null | head -3000)

  gemini --yolo -p "Implement GitHub issue #${issue_num}.

ISSUE:
${ISSUE_BODY}

CODEBASE CONTEXT:
${CODEBASE}

RULES:
- Write full implementation — real production code only
- Only touch files listed in issue's 'Affected Files'
- Output: actual file contents with filepath as header
- Follow patterns already in the codebase"

  git add -A
  git commit -m "feat: #${issue_num} [gemini]" || true
  git fetch origin main && git rebase origin/main
  git push origin "$BRANCH"

  gh pr create \
    --title "feat: ${slug} (closes #${issue_num})" \
    --body "Resolves #${issue_num}

## Agent
@gemini (Gemini CLI)

## Diff stats
$(git diff main --stat)" \
    --base main --head "$BRANCH"

  echo "→ Gemini PR opened for #${issue_num}