# jj Workflows

Step-by-step procedures per scenario. For command details, see [commands.md](commands.md).
Principle: **before any operation, confirm your current position (`@`) with `jj log` / `jj st`**, and **when in doubt, `jj undo`**.

---

## 1. Solo development (one person, straight onto main)

```bash
jj new main                 # Prepare a work commit on top of main (optional but recommended)
# ... edit files (snapshotted automatically) ...
jj describe -m "Add feature X"
jj bookmark move main --to @  # Advance main to the current commit
jj new                        # Move to a fresh empty commit for the next task
jj git push                   # Push to remote
```

Note: committing does not advance the bookmark automatically. Always `bookmark move`/`set` before pushing.

---

## 2. Feature branch + PR (GitHub, etc.)

```bash
jj git fetch
jj new main@origin            # Branch from the latest main
# ... implement ...
jj describe -m "Implement feature"
jj bookmark set my-feature -r @   # Name the branch
jj git push --bookmark my-feature # Push (may need --allow-new for a new bookmark)
# → open a PR on GitHub
```

Shortcut (auto-generate the bookmark name):
```bash
jj git push -c @     # Auto-create a push bookmark on @ and push
```

Addressing review feedback:
```bash
jj edit <feature-id>   # Jump to the commit in question
# ... fix ...
jj bookmark set my-feature -r @
jj git push --bookmark my-feature   # jj also handles the force-push equivalent for you
```

---

## 3. Organizing one piece of work into multiple commits

```bash
jj new                 # Just do all the work in one commit first
# ... lots of edits ...
jj split               # Interactively split: "this file/hunk → commit A, the rest → B"
# Or split as you go from the start:
jj new ; # change 1 ; jj describe -m "part1"
jj new ; # change 2 ; jj describe -m "part2"
```

Add a bit to the previous commit (git commit --amend):
```bash
# ... after editing more, while on @ ...
jj squash              # Fold @'s changes into the parent
```

---

## 4. Rebase (follow the latest main / reattach)

```bash
jj git fetch
jj rebase -s <root of your branch> -d main@origin   # Move your branch onto the latest main
# Example: move your commits forked from main together
jj rebase -s 'roots(main@origin..@)' -d main@origin
```

- If it conflicts, **the operation does not stop** — the conflict is recorded in the commit (see 5).
- For a single commit only, use `jj rebase -r <id> -d <dest>`.

---

## 5. Conflict resolution

jj stores conflicts in commits, so there's no need to panic.

```bash
jj st                  # Shows which files are conflicted
jj log                 # Commits containing conflicts are marked
jj resolve             # Resolve interactively with a merge tool
# Or just open the file by hand, edit the conflict markers, and save
jj st                  # Once the markers are gone, it's resolved
```

If multiple commits are conflicted, `jj edit <id>` into each commit and resolve them in turn.

---

## 6. Undo / redo (the most important safety net)

```bash
jj undo                # Undo the last jj operation. Try this first
jj op log              # List operation history (each row has an op ID)
jj op restore <op>     # Restore the whole repo to that point (rolls back several operations at once)
jj op show <op>        # Check what an operation did before restoring
```

"I broke things with a rebase" or "I abandoned too much" are recoverable from the op log. Even discarding commits can be undone per operation, so there's no need to fear destructive operations in jj.

---

## 7. Using jj alongside an existing Git repo (colocated)

```bash
cd existing-git-repo
jj git init --colocate    # Create .jj next to .git. You can keep using git commands too
jj log                    # Existing history shows up as-is
```

In a colocated repo, `@` (the working-copy commit) is kept in sync with Git's HEAD. Mixing git and jj is easy to get confused by, so lean toward jj as the primary tool.

---

## 8. Extracting / discarding part of a change

```bash
jj restore <path>            # Discard @'s changes to the given file (back to the parent state)
jj restore --from <id> <path># Overwrite with the contents from another commit
jj diffedit                  # Interactively pick and choose @'s diff
jj abandon <id>              # Discard an unneeded commit entirely (children reconnect to the parent)
```

---

## Quick mapping (Git → jj)

| What you want | Git | jj |
|---|---|---|
| Check status | `git status` | `jj st` |
| History | `git log --graph` | `jj log` |
| Record changes | `git add` + `git commit` | `jj commit -m` (no add) |
| Fix the message | `git commit --amend` | `jj describe` / `jj squash` |
| Append to the last commit | `git commit --amend` | `jj squash` |
| Create a branch | `git switch -c x` | `jj new` + `jj bookmark set x -r @` |
| Switch branches | `git switch x` | `jj edit x` / `jj new x` |
| Reattach | `git rebase` | `jj rebase -s/-d` |
| Undo | `git reset` / `git revert` | `jj undo` / `jj op restore` |
| fetch/push | `git fetch` / `git push` | `jj git fetch` / `jj git push` |
| Discard part | `git checkout -- file` | `jj restore <file>` |
