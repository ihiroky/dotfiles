---
name: jj
description: "Operating guide for the Jujutsu (jj) version control system. Use for commits, bookmarks, rebasing, conflict resolution, history rewriting, and undo in jj repositories. Trigger when jj / jujutsu is mentioned, or when doing version-control work (commit/branch/push/pull/merge/rebase/history-edit/undo) in any repo that has a `.jj/` directory. jj's model differs from Git (no staging, working-copy commit, change IDs, bookmarks), so follow this skill rather than translating git commands literally."
---

# Jujutsu (jj) Operating Guide

`jj` is a version control system with a Git-compatible backend. **Applying Git habits directly will lead you astray**, so internalize the mental model below before operating.

Reference: [Jujutsu for everyone](https://jj-for-everyone.github.io/). Assumes the jj 0.37 series.

## When to use jj (detection)

- The current repo **has a `.jj/` directory** → operate with jj, not git. Inspect with `jj st` / `jj log`.
- The user mentions "jj" or "jujutsu" → follow this skill.
- Only `.git` and no `.jj` → it's plain git; this skill is not needed.
- Quick check: if `jj root` succeeds, it's a jj repo. It may be colocated (both `.git` and `.jj` present).

## Most important mental model (differences from Git)

1. **There is no staging area.** Working-tree changes are **automatically snapshotted into the working-copy commit** every time you run a jj command. There is no `git add` equivalent — it's neither needed nor available.
2. **`@` = the working-copy commit.** The "commit you're on" is itself the edit target. You're always *inside* a commit, not "on top of" one.
3. **Change ID and Commit ID are different things.**
   - Change ID (e.g. `mkmqlnox`, letters) = the stable identity of a change. It **does not change** when you rewrite (amend/rebase). Use this day-to-day.
   - Commit ID (e.g. `f6feaadf`, hex) = the content hash. It changes every time you rewrite.
   - In revsets you can abbreviate to a unique prefix (`jj log` color-codes the unique prefix).
4. **Bookmark = roughly Git's branch, but it does NOT move automatically.** Committing leaves the bookmark behind. Advance it explicitly with `jj bookmark move` / `set`. A branch with no bookmark ("anonymous branch") is perfectly normal.
5. **Conflicts are recorded in commits.** A merge or rebase does not fail immediately; history advances carrying the conflict, and you resolve it calmly afterward.
6. **Every operation is logged in the op log and reversible with `jj undo`.** Operate without fear — this is jj's biggest safety net.

## Daily core (this covers most of the work)

```bash
jj st                       # See working-tree changes (git status)
jj log                      # Graph view of history. @ is where you are
jj diff                     # Contents of @ (git diff equivalent)

jj describe -m "message"    # Set a description on @ (commit message)
jj new                      # Create an empty commit on top of @ and move there (finalize work, start next)
jj commit -m "message"      # describe + new in one step (finalize current change, move to a new empty commit)
```

**Key pattern**: in jj you don't "change then commit" — you "`jj new` to make a container → edit → next `jj new`".
Running `jj new` *before* you start working keeps each logical change in its own clean commit.

## Rewriting history (jj's strength — looks destructive but is safe)

```bash
jj describe -r <id> -m "..."  # Fix the message of any commit after the fact
jj squash                     # Fold @'s changes into the parent (git commit --amend equivalent)
jj squash --into <id>         # Send @'s changes into an arbitrary commit
jj split                      # Interactively split one commit into several
jj edit <id>                  # Jump to a past commit and edit it directly (make it @)
jj rebase -r <id> -d <dest>   # Reattach a commit (or set of commits) elsewhere
jj abandon <id>               # Discard a commit (children reconnect to the parent)
jj undo                       # Undo the last jj operation
jj op log                     # Operation history. jj op restore <op> reverts the whole repo to any point
```

## Remote integration (Git backend)

```bash
jj git fetch                          # Fetch from remote
jj git push                           # Push tracked bookmarks
jj git push --bookmark <name>         # Push a specific bookmark
jj git push -c @                       # Auto-create a bookmark on @ and push (handy for opening a PR)
jj bookmark move main --to @-          # After committing, advance the bookmark to the latest (easy to forget)
```

## Common pitfalls

- **Committed but the bookmark didn't move** → before pushing, `jj bookmark move <name> --to @-` (or `set`).
- **`@` is an empty commit but you want to push** → push targets bookmarks. Point the bookmark at a real commit first.
- **Looking for `git add`** → not needed. Changes are tracked automatically, including new files (exclude via `.gitignore`).
- **Made a mistake** → first try `jj undo`. If that's not enough, `jj op log` → `jj op restore`.
- **Detached / extra branches appearing** → look at the whole picture with `jj log` and tidy up with `jj rebase`. Anonymous branches are not an error.

## Going deeper

- Full command reference: [reference/commands.md](reference/commands.md)
- Workflows (solo / collaboration / rebase / conflict resolution / undo / colocated / GitHub): [reference/workflows.md](reference/workflows.md)
- When unsure, check `jj <command> --help` before running. Even operations that look destructive can be reverted with `jj undo` — so first inspect state with `jj log`, then act.
