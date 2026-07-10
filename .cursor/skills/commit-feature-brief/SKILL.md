---
name: commit-feature-brief
description: >-
  Writes a concise markdown feature brief for a git commit into docs/commits/.
  Use when the user asks for a commit feature brief, changelog-style summary of
  a commit, docs for what a commit implemented, or to document features in the
  first/latest/any commit.
---

# Commit feature brief

Produce a short markdown brief of **features implemented in a git commit** and save it under `docs/commits/`.

## When to run

- User asks for a feature brief / summary of a commit (first, latest, SHA, or message)
- User asks to document what a commit implemented
- After creating a commit, if the user asks to brief it

## Resolve the commit

1. Default to `HEAD` if unspecified.
2. If the user says "first commit", use: `git rev-list --max-parents=0 HEAD`
3. Accept a short or full SHA, or resolve via `git log --grep` / `git rev-parse`

Capture metadata:

```bash
git log -1 --format='%H%n%s%n%b%nAuthor: %an <%ae>%nDate: %ad' <commit>
git show --stat --name-only <commit>
```

For root commits, treat the full tree as the change set (`git ls-tree -r --name-only <commit>`).

## Analyze features (not file lists)

Read the diff and key changed source files. Infer **user-facing and system capabilities**, not a dump of paths.

Focus on:

- New APIs, endpoints, CLI commands
- New graph nodes / workflows / routing
- Schemas, state fields, persistence
- Integrations (LLM providers, Studio, etc.)
- Docs/tooling only when they are part of the deliverable

Ignore noise: lockfile churn, formatting-only edits, generated artifacts unless they are the feature.

Optional depth for large commits:

```bash
git show <commit> -- <path>
```

## Output path

```
docs/commits/<short-sha>-<slug>.md
```

- `<short-sha>`: first 7 chars of the commit hash
- `<slug>`: kebab-case from the subject (lowercase, alphanumeric + hyphens, max ~40 chars)

Create `docs/commits/` if missing. Overwrite only if the same file already exists for that SHA and the user wants a refresh.

## Template

Use this structure (omit empty sections):

```markdown
# Commit feature brief: `<short-sha>` — <subject>

**Date:** <YYYY-MM-DD>  
**Author:** <name>  
**Scope:** <one-line change footprint, e.g. "N files" or area touched>

## Summary

<2–4 sentences: what this commit delivers and why it matters>

## Features

### <Capability area>

- <Concrete capability>
- <Concrete capability>

### <Capability area>

- ...

## Not in this commit

- <Explicit non-goals / reserved stubs / follow-ups visible in the code>
```

Rules:

- Lead with capabilities; group by area (API, graph, config, docs)
- Prefer bullets over prose walls
- Name real symbols (node names, routes, schema fields) when they are the feature
- Keep the whole brief brief — typically under ~80 lines
- Do not invent features not present in the commit

## Workflow checklist

```
- [ ] Resolve commit SHA
- [ ] Collect metadata + file list / diff stats
- [ ] Read key changed source (not only --stat)
- [ ] Draft Summary + Features (+ Not in this commit if useful)
- [ ] Write docs/commits/<short-sha>-<slug>.md
- [ ] Tell the user the path and one-line summary
```

## Example

Input: first commit `77e00a2` (`initial-commit`)

Output path: `docs/commits/77e00a2-initial-commit.md`

Content pattern: Summary of Express + LangGraph research scoping API; Features grouped as research graph, LLM nodes, HTTP API, tooling & docs; Not in this commit for reserved research/report stages and frontend.
