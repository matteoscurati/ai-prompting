---
description: Improve, rewrite, debug, or compress a prompt for any LLM agent. Applies the ai-prompting Skill — strips padding, scaffolds with role/objective/context/task/constraints/output_format/quality_bar, scores 0-100, surfaces explicit assumptions. Use when the user asks to make a prompt better, more reliable, cheaper, clearer, structured, or model-specific.
argument-hint: <prompt to improve> [--mode final_only|compact|standard|diagnostic] [--target claude|openai|gemini|local] [--task <type>] [--language it|en] [--audience "..."] [--token-budget minimal|balanced|generous] [--clarify auto|always|never]
allowed-tools: Read Bash
---

# /ai-prompting:improve

Slash-command adapter for the **ai-prompting** Skill. This file does two things: resolve the
canonical procedure, and map slash syntax onto its options.

The procedure itself — decision flow, padding list, XML scaffold, output templates, rubric,
post-improvement choice block — is defined once in `SKILL.md` and is deliberately **not** restated
here. Two copies drift; one copy cannot.

## 1. Resolve the procedure

Stop at the first hit.

1. **The host already has the `ai-prompting` Skill loaded** → use it. Nothing to resolve.
2. **The package is installed** → locate and read `SKILL.md`:
   ```bash
   node -e "console.log(require.resolve('ai-prompting/SKILL.md'))"
   ```
   Follow its decision flow. The `references/*.md` files sit beside it; load them only when
   SKILL.md's own cost-control rules call for it.
3. **Neither** → take a deterministic baseline from the CLI and refine it semantically yourself:
   ```bash
   npx ai-prompting improve --prompt "<prompt body>" --mode <mode>
   ```
   Say in one line that the Skill wasn't found and this is the rule-based fallback, so the user
   knows which layer produced the result.

## 2. Parse `$ARGUMENTS`

Flags may appear in any position; strip them from the prompt body before processing. Everything
that is not a flag is the prompt to improve. If `$ARGUMENTS` is empty or contains only flags, ask
the user for the prompt.

| Flag | Skill option |
|---|---|
| `--mode` | `mode` |
| `--language` | `language` |
| `--task` | `taskType` |
| `--target` | `targetAgent` |
| `--audience` | `audience` |
| `--token-budget` | `tokenBudget` |
| `--clarify` | `clarify` |

Values, defaults, and semantics live in the **Options** table in `SKILL.md`. That table also lists
the natural-language equivalents ("in italiano", "non chiedere", "solo prompt", "compatto") that
apply when the matching flag is absent — a flag always wins over prose.

## 3. Run it

Execute the resolved decision flow with the parsed options. `SKILL.md` is authoritative for the
output template, the clarification policy, and the post-improvement choice block; do not re-derive
any of them from this file.

---

**User input:** $ARGUMENTS
