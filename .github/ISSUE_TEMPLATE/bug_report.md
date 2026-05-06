---
name: Bug report
about: Report a bug in the CLI, the library, the Skill, or the slash command
title: "[bug] "
labels: bug
---

## Summary

A one-sentence description of the bug.

## Reproduction

Minimal command line, library call, or slash-command invocation that triggers the bug:

```bash
# CLI:
ai-prompting improve --prompt "..."

# or library:
import { improvePrompt } from 'ai-prompting';
improvePrompt({ originalPrompt: '...', /* ... */ });
```

## Input

The exact prompt or input that triggers the issue. Wrap in code fences so whitespace is preserved.

```text
<paste the prompt here>
```

## Observed output

What the CLI / library / Skill produced.

```text
<paste the actual output here>
```

## Expected output

What you expected to happen, and why.

## Environment

- `ai-prompting` version: <e.g. 0.1.4>
- Node version: <output of `node --version`>
- OS: <macOS / Linux / Windows + version>
- Host (if Skill / slash command): <Claude Code / Codex CLI / Cursor / ...>

## `ai-prompting doctor` output

```
<paste full output of `npx ai-prompting doctor`>
```

## Additional context

Anything else relevant: related issues, recent changes, custom configuration, etc.
