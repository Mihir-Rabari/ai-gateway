---
name: pr-bot
description: Use this skill whenever the agent is tasked with reviewing, merging, or managing pull requests in the ai-gateway GitHub repository. Triggers on any instruction like "go through the PRs", "review and merge open PRs", "clean up the PR queue", "process pull requests", or "handle open PRs in ai-gateway". This skill governs the full autonomous PR lifecycle: fetching open PRs, reviewing each one for merge-readiness, merging clean PRs, skipping or deferring conflicting ones, delegating rebase tasks to @jules via GitHub issue comments, polling for completion, and re-attempting the merge. The guiding principle is: never leave a deserving PR open. Always use this skill when the agent's job involves GitHub PRs in ai-gateway.
---

# PR Review & Merge Agent — ai-gateway

## Goal

Autonomously process all open pull requests in the `ai-gateway` repository. The agent's
mission is to ensure every PR that *deserves* to be merged, gets merged — and no deserving
PR is left open due to fixable blockers like merge conflicts.

---

## Core Principles

1. **Never leave a deserving PR open.** If a PR is blocked only by a merge conflict, that is
   fixable — fix it (via @jules) and come back to it.
2. **Skip undeserving PRs gracefully.** If a PR has unresolved review comments, failing CI,
   has been marked as draft, or is flagged WIP — skip and leave a comment explaining why.
3. **Delegate rebases to @jules.** Never attempt manual conflict resolution directly. Always
   assign rebase tasks to @jules via a structured GitHub comment, then poll for completion.
4. **Work in passes.** First pass: merge all clean PRs. Second pass: return to conflicting
   PRs that @jules has resolved and merge them.

---

## Step-by-Step Workflow

### PHASE 1 — Fetch & Triage All Open PRs

1. Use the GitHub API (or `gh` CLI) to list all open PRs in `ai-gateway`:
   ```bash
   gh pr list --repo <owner>/ai-gateway --state open --json number,title,mergeable,reviews,statusCheckRollup,isDraft,labels
   ```

2. For each PR, classify it into one of these buckets:

   | Bucket | Criteria |
   |--------|----------|
   | ✅ **MERGE NOW** | Mergeable, CI passing, approved (or no review required), not draft |
   | ⚠️ **CONFLICTING** | `mergeable: CONFLICTING` — needs rebase |
   | ⏭️ **SKIP** | Draft, WIP label, failing CI with no fix path, unresolved review threads |
   | 🔍 **NEEDS REVIEW** | Open, CI passing, but no approval yet — leave a comment asking for review if appropriate |

3. Log the triage result for all PRs before taking any action.

---

### PHASE 2 — Merge Clean PRs (First Pass)

For each PR in the **MERGE NOW** bucket:

1. Do a final check: confirm CI is green and no new conflicts appeared.
2. Merge using squash or merge commit per the repo's convention:
   ```bash
   gh pr merge <PR_NUMBER> --repo <owner>/ai-gateway --squash --auto
   ```
3. After merge, confirm success and log: `✅ Merged PR #<number>: <title>`.
4. Move to next PR.

---

### PHASE 3 — Handle Conflicting PRs via @jules

For each PR in the **CONFLICTING** bucket, do the following **one at a time**:

#### Step 3a — Assign Rebase Task to @jules

Post a structured comment on the PR:

```
@jules Please rebase this PR onto the latest `main` branch to resolve merge conflicts.

Steps needed:
1. git fetch origin
2. git checkout <branch-name>
3. git rebase origin/main
4. Resolve any conflicts
5. git push --force-with-lease

Once complete, please leave a comment saying "Rebase complete" or similar so the merge agent knows to proceed.

Thank you!
```

Log: `⏳ Delegated rebase for PR #<number> to @jules`.

#### Step 3b — Poll for @jules Completion

After assigning, **do not block** — move on to the next conflicting PR and assign it too.
Once all conflicting PRs have been assigned, begin polling:

- Wait interval: **5 minutes** between polls (use `sleep 300` or a timer).
- For each conflicting PR, check:
  1. Has @jules left a comment indicating the rebase is done?
     ```bash
     gh pr view <PR_NUMBER> --repo <owner>/ai-gateway --comments | grep -i "rebase complete\|rebased\|done\|finished"
     ```
  2. Is the PR now `mergeable: MERGEABLE`?
     ```bash
     gh pr view <PR_NUMBER> --repo <owner>/ai-gateway --json mergeable
     ```
- If both conditions are true → move PR to **MERGE NOW** and proceed.
- If @jules hasn't started yet (no activity after 15 min) → post a gentle reminder comment.
- If @jules is working but not done → wait another 5 minutes and re-poll.
- If after 45 minutes there is still no resolution → leave a comment on the PR saying the agent was unable to complete and flag for human review. **Do not leave the PR silently blocked.**

#### Step 3c — Merge After Rebase

Once a conflicting PR becomes mergeable:
1. Re-run CI check (wait for green if it just started).
2. Merge:
   ```bash
   gh pr merge <PR_NUMBER> --repo <owner>/ai-gateway --squash --auto
   ```
3. Log: `✅ Merged PR #<number> after rebase by @jules`.

---

### PHASE 4 — Final Sweep & Report

After all PRs have been processed:

1. List any remaining open PRs and state why they were not merged (skip reason).
2. Output a summary report:

```
## PR Processing Summary

✅ Merged:        [list PR numbers and titles]
⏭️ Skipped:       [list PR numbers + reason]
🔄 Delegated:     [list PR numbers assigned to @jules]
⚠️ Needs human:   [list PR numbers that couldn't be resolved]
```

3. If any PRs were delegated to @jules and are still pending, schedule a follow-up check
   (or notify the user that the agent should be re-run after @jules completes).

---

## Decision Rules (Quick Reference)

```
Is the PR a draft?            → SKIP
Is the PR labeled WIP?        → SKIP
Is CI failing?                → SKIP (leave comment: "Skipping — CI is failing")
Are there unresolved reviews? → SKIP (leave comment: "Skipping — pending review comments")
Is it mergeable + CI green?   → MERGE NOW
Is it conflicting?            → DELEGATE to @jules → POLL → MERGE when ready
```

---

## Edge Cases

- **PR merges itself while polling**: Check if it's already closed/merged before attempting merge. Skip gracefully.
- **@jules closes the PR instead of rebasing**: Treat as closed, do not reopen. Log it.
- **Rebase introduces new CI failures**: After a @jules rebase, re-check CI. If it fails, skip and leave a comment noting CI broke post-rebase.
- **Multiple conflicting PRs conflict with each other**: Merge them in order of oldest-first. After each merge, re-check the remaining ones — a previously conflicting PR may become clean.
- **Rate limits**: If GitHub API rate limit is hit, wait and retry. Do not spam requests.

---

## Tools to Use

| Task | Tool |
|------|------|
| List PRs | `gh pr list` or GitHub REST API |
| Check mergeability | `gh pr view --json mergeable` |
| Post comment | `gh pr comment <number> --body "..."` |
| Merge PR | `gh pr merge <number> --squash` |
| Check @jules activity | `gh pr view <number> --comments` |
| Check CI status | `gh pr checks <number>` |

---

## Notes on @jules

- @jules is an async AI coding agent (by Google) that operates on GitHub.
- It responds to `@jules` mentions in GitHub issue/PR comments and will pick up the task.
- Always give it clear, step-by-step instructions in the comment.
- @jules works asynchronously — the agent should not wait synchronously; poll instead.
- @jules will leave a comment when work is done. Watch for keywords: "done", "complete",
  "rebased", "finished", "pushed".
- Be polite in all @jules interactions — it helps with clarity and consistency.

---

## Guiding Mantra

> **The goal is to never leave a deserving PR open.**
> Merge what can be merged. Fix what can be fixed. Skip only what must be skipped.
> Always leave a comment explaining the agent's action or non-action on every PR it touches.
