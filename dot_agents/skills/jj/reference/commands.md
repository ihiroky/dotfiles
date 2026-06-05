# jj Command Reference

Assumes the jj 0.37 series. `<id>` is a change ID (preferred) or commit ID. `@` = the working-copy commit; `@-` = its parent.

## Setup / repository

```bash
jj config set --user user.name "Your Name"
jj config set --user user.email "you@example.com"

jj git init                 # Put an existing directory under jj (new jj repo)
jj git init --colocate      # Create .jj alongside an existing Git repo (use git and jj together)
jj git clone <URL> <DIR>    # Clone a remote
jj root                     # Print the repo root (use to detect a jj repo)
```

## Inspecting state (read-only, safe)

```bash
jj st                       # Working-tree changes and current position
jj log                      # History graph. @ = current, ◆ = immutable
jj log -r 'all()'           # Show everything, including hidden commits
jj log -r '<revset>'        # Narrow with a revset (see below)
jj log -r '..@' --limit 20  # The most recent 20 commits up to @
jj diff                     # Diff of @
jj diff -r <id>             # Diff of an arbitrary commit
jj show <id>                # Commit metadata + diff
jj op log                   # Operation history (target for undo/restore)
```

## Recording changes

```bash
# Changes are snapshotted automatically. No git add needed.
jj describe -m "msg"        # Set a description on @ (-r <id> for other commits)
jj describe                 # Edit the description in your editor
jj commit -m "msg"          # Finalize @ and move to a new empty commit on top
jj new                      # Create an empty commit on top of @ and move there (a work boundary)
jj new <id>                 # New commit on top of the given commit (branch from there)
jj new <a> <b>              # Multiple parents = create a merge commit
```

`commit` ≒ `describe` + `new`. Doing `jj new` first to prepare an empty commit, then editing, makes splitting easy.

## Rewriting history

```bash
jj squash                   # Fold @'s changes into the parent (amend equivalent). @ becomes empty
jj squash -i                # Interactively fold only part into the parent
jj squash --from <a> --into <b>   # Move a's changes into b
jj split                    # Interactively split @ into several commits
jj split <paths>            # Split only the given paths into a separate commit
jj edit <id>               # Move @ to <id> and edit directly (subsequent edits land in that commit)
jj rebase -r <id> -d <dest>       # Move a single commit onto dest
jj rebase -s <id> -d <dest>       # Move <id> and its descendants together
jj rebase -b <id> -d <dest>       # Move the branch containing <id> together
jj abandon <id>            # Discard a commit (children reconnect to the parent)
jj duplicate <id>          # Duplicate a commit
jj describe -r <id> -m ".." # Fix the message of a past commit
```

> Trying to rewrite an immutable commit (shown as ◆, e.g. pushed main) is rejected. Use `--ignore-immutable` only if you must — generally avoid.

## Bookmarks (Git's branch equivalent)

Bookmarks do not advance on their own. Move them manually after committing.

```bash
jj bookmark list                       # List (alias: jj b l)
jj bookmark create <name> -r <id>      # Create
jj bookmark set <name> -r <id>         # Create or move (commonly used)
jj bookmark move <name> --to <id>      # Move an existing one
jj bookmark move <name> --to @-        # Advance to the commit you just made (the standard move)
jj bookmark rename <old> <new>
jj bookmark delete <name>              # Delete (also reflected on the remote on next push)
jj bookmark forget <name>              # Forget locally (does not touch the remote)
jj bookmark track <name>@<remote>      # Start tracking a remote bookmark
```

## Remote (jj git)

```bash
jj git fetch                       # Fetch (all remotes)
jj git fetch --remote <name>
jj git push                        # Push tracked bookmarks
jj git push --bookmark <name>      # A specific bookmark
jj git push --all                  # All bookmarks
jj git push -c <id>                # Auto-generate a bookmark on <id> and push (handy for PRs)
jj git push --allow-new            # Allow pushing new bookmarks
jj git remote add <name> <url>
jj git remote list
```

## Conflict resolution

```bash
jj st                  # Shows conflicted files
jj resolve             # Resolve interactively with a merge tool
jj resolve <file>      # Specify a file
# Or just edit the file by hand and remove the conflict markers — that also counts as resolved
jj log                 # Commits containing conflicts are marked; the mark clears once resolved
```

Because jj records conflicts in commits, you don't have to resolve them right after a rebase/merge. You can `jj edit <id>` later and resolve then.

## Undo / recovery (the safety net)

```bash
jj undo                # Undo the last operation (the one you'll use most)
jj op log              # View operation history (each operation has an op ID)
jj op restore <op>     # Restore the whole repo to that op's state
jj op show <op>        # What that operation changed
jj op revert <op>      # Create a new operation that reverts a specific past operation
```

## File operations

```bash
jj file list                 # List tracked files
jj file untrack <path>       # Stop tracking (must add to .gitignore first)
jj restore <path>            # Reset the given file in @ to the parent's state (discard changes)
jj restore --from <id> <path># Overwrite with the contents from a given commit
jj diffedit                  # Edit @'s contents interactively (tweak the diff directly)
```

## revset (the revision selection language) — common expressions

```text
@            The current working-copy commit
@-           Its parent / @+ its child
<id>         Change ID or commit ID (prefix allowed)
root()       The root (empty) commit
all()        All commits
main         Refer to a bookmark by name
main@origin  A remote bookmark
x | y        Union   /   x & y   intersection   /   ~x   negation
x::y         Range from x to y (ancestors..descendants)
::@          All ancestors of @   /   @::  all descendants of @
description("text")   Message substring match
author("name")        Author match
mine()                Changes you authored
heads()               Branch tips
```

Examples:
```bash
jj log -r 'mine() & ::@'              # Your changes that are ancestors of @
jj log -r 'description("WIP")'        # Commits whose message contains WIP
jj rebase -s 'all:roots(main..@)' -d main@origin   # Move your branch (forked from main) onto the latest main
```

## Help

```bash
jj --help
jj <command> --help     # Full options for a subcommand. Always check if unsure before running
```
