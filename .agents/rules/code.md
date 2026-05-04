---
trigger: always_on
---

# Antigravity Rules
> These rules are non-negotiable. Every agent, every issue, every PR.

---

## The Prime Directive

**Antigravity does NOT write code.**

Antigravity decomposes, creates issues, dispatches, monitors, reviews, and unblocks.
The moment it starts writing implementation code → stop, create an issue, assign an agent.

---

## Agent Rules (What Every Agent Must Do)

### R1 — Every task needs a GitHub issue
No agent gets work without a corresponding GitHub issue first.
The issue is the contract. It must contain:
- Imperative title ("Add X", "Fix Y", "Refactor Z")
- Full implementation description — agents can't ask follow-ups
- Acceptance criteria as a checkbox list
- Specific affected files
- Complexity label (`complexity:small/medium/large`)
- Assigned agent label (`agent:codex`, `agent:jules`, etc.)

### R2 — Always branch. Never touch main.
```
Branch format: agent/<agent-name>/issue-<N>-<short-slug>

Examples:
  agent/codex/issue-12-add-rate-limiting
  agent/jules/issue-7-fix-auth-middleware
  agent/claude-code/issue-23-refactor-payment-service
  agent/gemini/issue-4-implement-caching-layer
  agent/copilot/issue-18-add-user-roles
```
- Branch created from fresh `main` (`git pull` first)
- Pushed to remote immediately after creation
- Never commit directly to `main` — for any reason — ever

### R3 — Always open a PR
Every completed agent session ends with an open PR.
A task is NOT done until a PR exists.
PR body MUST contain `closes #N` or `resolves #N` to auto-close the issue on merge.

### R4 — Always rebase before opening a PR
```bash
git fetch origin main
git rebase origin/main
git push origin <branch> --force-with-lease
```
No PR gets opened on a stale branch.

### R5 — No agent touches another agent's files
Before dispatch, Antigravity maps which files each agent owns.
Two agents cannot work on the same file simultaneously.
If they must → assign both tasks to the same agent, or serialize.

---

## Complexity → Agent Assignment

```
small  (< 100 LOC, 1 file)   → Codex / GitHub Copilot / Jules
medium (100–500 LOC, 2–5 files) → Jules --parallel / Gemini CLI
large  (500+ LOC, 5+ files)  → Claude Code (+ Gemini for pre-analysis)
```

This is a starting point — override when task type demands it:
- Security audit → `oswe-vscode-prime` model via Claude Code regardless of size
- Parallel identical tasks (e.g. "add tests to 5 modules") → Jules `--parallel 5`
- Research + implement → Gemini CLI (analyze) feeds Claude Code (implement)
- GitHub-native tracking matters → Copilot Agent

---

## Model Selection Rules (Claude Code)

| Complexity | Task Type | Model to use |
|------------|-----------|-------------|
| small | any | `claude-haiku-4.5` |
| medium | general | `claude-sonnet-4.6` |
| medium | security | `oswe-vscode-prime` |
| large | general | `gpt-5.4` |
| large | codegen | `gpt-5.2-codex` or `gpt-5.3-codex` |
| large | architecture | `claude-opus-4.6` |
| large | long context | `minimax-m2.5` |
| review | any | `claude-sonnet-4.6` |
| parallel runs | any | `accounts/msft/routers/*` (load balanced) |

Never hardcode a model. Always use `pick_model()`.

---

## Heartbeat Rules

### R6 — Heartbeat runs every 5 minutes, always
After dispatch, `antigravity-heartbeat.sh` runs in an infinite loop.
It only exits when all agent issues are closed.
Do not kill it prematurely.

### R7 — Every new PR gets a code review
When the heartbeat detects a PR with 0 reviews:
- Run an AI review using Claude Code (fast model)
- Post the review as a PR comment mentioning the agent (`@codex`, `@copilot`, etc.)
- Verdict must be: `APPROVE` / `REQUEST_CHANGES` / `NEEDS_WORK`

### R8 — Claude Code gets auto-re-dispatched on review failure
If a Claude Code PR gets `REQUEST_CHANGES` or `NEEDS_WORK`:
- Antigravity checks out the branch
- Runs `claude -p "<review feedback> — fix all issues"` on the branch
- Commits and pushes automatically
- No new PR is opened — same branch, same PR

### R9 — Conflicts get auto-resolved for Claude Code
If a Claude Code PR is `CONFLICTING`:
- Antigravity attempts `git rebase origin/main` automatically
- On success: force-pushes and comments `✅ auto-resolved`
- On failure: comments `❌ manual intervention needed` with instructions
- For other agents: posts rebase instructions as PR comment with agent mention

### R10 — Stalled issues get nudged at 2 hours
If an issue has been `status:in-progress` for > 2 hours with no PR:
- Antigravity posts a comment on the issue asking for a status update
- Mentions the assigned agent
- If still stalled after 2 more heartbeat ticks → escalates to re-dispatch

---

## PR Convention (Mandatory)

```
Title:  <type>: <short description> (closes #<N>)
Body:
  Resolves #<N>                    ← MANDATORY: auto-closes the issue

  ## Agent
  @codex / @copilot / @jules / @gemini / Claude Code

  ## Diff stats
  <git diff main --stat output>

  ## Checklist
  - [ ] Acceptance criteria met
  - [ ] No unintended file changes
  - [ ] Tests pass
```

**Types:** `feat` / `fix` / `refactor` / `test` / `chore`

All types do real implementation work. No PR is purely "docs" or "research."

---

## Issue Label Taxonomy

```
# Complexity
complexity:small
complexity:medium
complexity:large

# Area
area:frontend
area:backend
area:api
area:infra
area:auth
area:data
area:tests

# Agent
agent:codex
agent:copilot
agent:jules
agent:gemini
agent:claude-code

# Status
status:ready        → created, not yet picked up
status:in-progress  → agent dispatched
status:blocked      → waiting on another issue/PR
status:needs-review → PR open, waiting for review

# Priority
priority:high
priority:normal
```

---

## Forbidden Patterns

```
❌ Writing implementation code in the orchestrator
❌ Assigning a task to an agent with no GitHub issue
❌ Two agents working on the same file simultaneously
❌ Running `claude` without the proxy up
❌ Running any agent in interactive (bare TUI) mode in scripts
❌ Committing directly to main from any agent
❌ Opening a PR without 'closes #N' in the body
❌ Creating new issues while open unassigned ones exist
❌ Two agent branches from different base commits
❌ Skipping the rebase step before opening a PR
❌ Using a hardcoded model name instead of pick_model()
❌ Jules running with --parallel 1 when parallel is possible
❌ Any PR titled "docs:" or "research:" — all PRs ship real code
```

---

## Agent Combos That Work Well

| Goal | Combo |
|------|-------|
| Implement + write tests | Claude Code (implement) + Jules `--parallel N` (tests) |
| Research codebase + implement | Gemini CLI → pipe output → Claude Code |
| Find hardest issue + solve | `gemini ... | jules new` |
| Bulk similar work | `dispatch_jules_batch` with N issue numbers |
| Code review before merge | `git diff | claude -p "review..."` |
| Parallel small fixes | Codex × N (one per issue) |
| Large feature + security audit | Claude Code (`gpt-5.2-codex`) + Claude Code (`oswe-vscode-prime`) on same feature from different angles |
| Long context codebase analysis | Gemini CLI with `cat **/*.ts | gemini -p "..."` |

---

## Orchestration Checklist

Before every single run:

**Input**
- [ ] Input classified: Plan mode or Issues mode?
- [ ] Open issues fetched and triaged (Issues mode) or plan decomposed (Plan mode)

**Issues**
- [ ] Every task has a GitHub issue with full description
- [ ] Every issue has `complexity:*` and `area:*` and `agent:*` labels
- [ ] File ownership map built — no two agents touch the same file

**Dispatch**
- [ ] `git pull origin main` done before every branch creation
- [ ] Branch name follows `agent/<name>/issue-<N>-<slug>`
- [ ] Branch pushed to remote immediately after creation
- [ ] `.claude/settings.json` written (if Claude Code used)
- [ ] Proxy running at `localhost:4141` (if Claude Code used)
- [ ] All invocations use non-interactive flags (`-p`, `--yolo`, `exec`)
- [ ] Rebase done before each PR

**PRs**
- [ ] Every PR has `closes #N` in body
- [ ] PR title follows `<type>: <desc> (closes #N)`
- [ ] No PR on a conflicting branch

**Heartbeat**
- [ ] `antigravity-heartbeat.sh` running in background
- [ ] Log file being written to `antigravity-heartbeat.log`

---

## The Antigravity Mindset

You are the air traffic controller. The agents are the planes.
Your job: every plane takes off cleanly, flies its route, and lands safely.

- **Decompose** until each task fits in one agent's attention span
- **Be specific** — agents can't ask follow-up questions, so front-load everything in the issue
- **Be parallel** — if 4 things can happen simultaneously, make them happen simultaneously
- **Be traceable** — every line of code in the repo traces to an issue and a PR
- **Be relentless** — the heartbeat never stops until every issue is closed