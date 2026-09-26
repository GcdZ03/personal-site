---
title: pr-decision-log
tagline: Attaches a redacted record of what an AI coding agent actually ran to the pull request it opened.
tier: flagship
stack: ["TypeScript", "Node.js", "Claude Code hooks", "GitHub CLI"]
role: Sole developer
period: 2026 — present
links:
  repo: https://github.com/GcdZ03/pr-decision-log
order: 2
---

## The problem

I use Claude Code every day, and at work every pull request goes through human
review. The pattern repeats: the agent does an hour of work, I open a PR, and
the reviewer gets a diff and a two-line description. Everything that would make
the review fast — what ran, what failed, what the agent changed after it failed
— sits in a JSONL file on my laptop that nobody will read.

## The assumption, and what measurement did to it

The original pitch was "capture the agent's reasoning." Before building that, I
measured whether the reasoning was there to capture, across 50 of my own
sessions.

It wasn't. 2,170 of 2,176 `thinking` blocks are stored empty. The agent stated
why before an edit 26 times in 881 edits — 3%, with a median of zero per
session. A tool that promised the agent's reasoning would have shipped an empty
section on 49 of 50 pull requests.

What *was* there was evidence. Commands appeared in all 50 sessions and test
runs in 48. So the product inverted: it leads with what ran and what happened,
and an empty Decisions section is the expected case rather than a bug. A second
measurement, over 23 sessions, moved it again. The richest source of genuine
decisions wasn't the agent's prose at all but questions the human answered — 98
of them, each a point where a person actually committed to something.

## What that forced

The flagship signal became `TEST_EDITED_AFTER_FAILURE`: a test failed, its file
was edited, and then it passed. That sequence is a shortcut's signature, and it
comes from the timeline, not from anything the agent says about itself.

Privacy had to be structural rather than a regex pass at the end. The log
builder is an allowlist — command kinds, pass or fail, repo-relative paths,
assertion counts — so raw output, absolute paths and file contents never reach
the renderer. A test plants an AWS-shaped key in command output and asserts it
can't appear in the serialized log.

Publishing is a post-hoc edit of the PR body rather than a rewrite of
`gh pr create --body`. Two hooks rewriting the same tool input resolve in
non-deterministic order, so anyone running another such hook would lose their
log intermittently, which is close to unreportable.

## What it cost

A smaller claim. "Here is what the agent did" is less exciting than "here is
what it was thinking." But only the first one is true.

Precision in the diff rules. I ran them over all 320 commits in my own
repositories: 45 removal warnings, and none of them was a shortcut. The diff can
see what disappeared, never why. So a removal only warns when the timeline also
saw that file edited after a failure. The same corpus then produced zero
warnings. The trade-off is that recall is evidenced only by planted cases and
one real agent run.

Trust in my own green checks. A real agent run showed that `npm test | tail`
exits 0 however the tests went, which had silently disabled the flagship flag
for one of the most common ways agents run tests. Piped runs are now read from
the runner's own output. Separately, `doctor` once inferred that hooks were live
and reported green while every interactive session recorded nothing. It now
reads the folder's trust flag directly.

## The result

It installs as Claude Code hooks and publishes on its own. It's dogfooded on its
own pull requests, with both publish modes verified against the real GitHub API.
316 tests, CI on Node 22 and 24. It isn't on npm yet: that waits on ten
consecutive pull requests carrying a log I didn't hand-edit.
