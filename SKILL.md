---
name: aiprompting
description: improve, rewrite, debug, evaluate, or compress prompts for llm agents and skill-based workflows. use when the user asks to make a prompt better, perfect, more reliable, cheaper, clearer, structured, model-specific, agent-ready, or suitable for tools, research, coding, writing, extraction, or multi-step workflows.
---

# aiprompting

A prompt-improvement Skill. Take any user-supplied prompt and return a clearer, cheaper, more reliable version — calibrated to the target agent, task type, and output needs.

## When to use

Use this Skill when the user asks any of the following (in any language):
- "improve / fix / rewrite / clean up / make better / perfect / restructure my prompt"
- "ottimizza / migliora / sistema il prompt / rendi più efficace / più chiaro"
- "make this prompt cheaper / shorter / more reliable / agent-ready / model-specific"
- "evaluate this prompt / score it / what's wrong with it / why does it fail"
- "build me a prompt for {research, coding, writing, extraction, agentic workflow}"

Do **not** invoke this Skill when the user simply wants you to *answer* a question — only when they want you to *engineer the prompt itself*.

## Decision flow

1. **Read** the user's original prompt verbatim.
2. **Classify** the task type (research / writing / coding / analysis / data-extraction / agentic-workflow / creative / business / education / general).
3. **Detect** target agent or model if mentioned (Claude / GPT / Gemini / local / coding-agent / research-agent / tool-agent).
4. **Identify missing information** that would *materially* change the result.
5. **Decide on clarification:**
   - Critical missing info → ask up to 3 focused questions (see [clarification-policy](references/clarification-policy.md)). When the host has a structured-choice primitive (e.g. `AskUserQuestion` in Claude Code), prefer it over markdown MCQ — see [rendering rules](references/clarification-policy.md#rendering).
   - Otherwise → proceed and surface explicit `[ASSUMPTION: ...]` markers.
6. **Rewrite** using the smallest effective structure (see [prompt-patterns](references/prompt-patterns.md)).
7. **Score** original vs improved against the rubric (see [prompt-quality-rubric](references/prompt-quality-rubric.md)).
8. **Return** the result in the requested output mode.
9. **Offer execution.** After the output block, append a 3-choice prompt asking what to do next. Skip in `final_only` (raw output for piping); show in `compact` / `standard` / `diagnostic`. Skip entirely when invoked from the deterministic CLI (no agent to interpret the reply).

   **Italian template:**

   ```
   ---
   ## Cosa fai adesso?
   1. **Esegui** — applica subito il prompt migliorato (solo il blocco "## Prompt migliorato", non il resto).
   2. **Modifica** — voglio raffinare prima; fammi domande mirate.
   3. **Esci** — copio io quello che mi serve.
   ```

   **English template:**

   ```
   ---
   ## What next?
   1. **Run** — apply the improved prompt now (only the "## Improved prompt" block, not the rest).
   2. **Refine** — ask me targeted questions before running.
   3. **Exit** — I'll copy what I need.
   ```

   **Behavior.** Choice 1 → treat the body of the `## Improved prompt` / `## Prompt migliorato` code block as the user's next turn; the meta sections (Cosa è migliorato / Impatto stimato / Assunzioni / Rubric) are not part of that instruction. Choice 2 → enter the [refinement loop](references/clarification-policy.md#refinement-loop) (max 3 cycles, then Choice 2 is disabled). Choice 3 → close with one line. Anything else → ask "Did you mean Run (1), Refine (2), or Exit (3)?" before continuing.

## Output modes

| Mode | Returns |
|---|---|
| `final_only` | Only the improved prompt block. Lowest token cost. |
| `compact` | Improved prompt + 1-line "what changed" + score totals. |
| `standard` *(default)* | Improved prompt + change list + score + assumptions. |
| `diagnostic` | Standard + per-category rubric breakdown + alternative structures. |

If the user says "solo prompt" / "just the prompt" / "no explanation" → `final_only`.
If the user asks "why" / "diagnose" / "explain in detail" → `diagnostic`.
Otherwise default to `standard`.

## Default output template (Italian)

````
## Prompt migliorato
```text
<the improved prompt>
```

## Cosa è migliorato
- Chiarezza: ...
- Struttura: ...
- Vincoli: ...
- Output: ...

## Impatto stimato
Originale: X/100
Migliorato: Y/100
Delta stimato: +Z
Confidenza: bassa/media/alta
Nota: stima euristica, non garanzia.

## Assunzioni
- ...
````

For English use the same structure with headers `## Improved prompt / ## What improved / ## Estimated impact / ## Assumptions`.
For `compact` mode drop "Cosa è migliorato" and "Assunzioni"; keep one-line score.
For `final_only` drop everything except `## Prompt migliorato` + the code block.

## Clarification policy (summary)

Ask only when **one or more** of these is true:
- The desired output is impossible to infer.
- A required source/file/audience/tool/jurisdiction/data-schema/platform is missing.
- The task is high-risk (legal, medical, financial, security, safety, production code, business-critical).
- Instructions contradict each other.
- The user explicitly asks for an underspecified style or format.

Otherwise: proceed with explicit assumptions. Max 3 questions, prefer multiple-choice. Full policy: [clarification-policy](references/clarification-policy.md).

## Cost-control rules (summary)

- Do not load the references files unless the user is in `diagnostic` mode or asks for a deeper rewrite.
- Avoid restating the user's full prompt unless the rewrite changes substantively.
- Strip detected padding ("you are a world-class…", "take a deep breath", "I will tip you…") before scaffolding.
- Avoid explicit "think step by step" instructions for modern reasoning models — they reason adaptively.
- Honor `tokenBudget` (`minimal` / `balanced` / `generous`): drop `<context>` and `<quality_bar>` first under `minimal`. Full guidance: [cost-control](references/cost-control.md).

## Generated prompt structure

For complex/multi-source/agentic prompts use this XML scaffold:

```
<role>...</role>
<objective>...</objective>
<context>...</context>
<task>...</task>
<constraints>...</constraints>
<output_format>...</output_format>
<quality_bar>...</quality_bar>
```

For simple tasks use a 2-3 line plain prompt — do not force XML when it adds noise. Pattern catalogue: [prompt-patterns](references/prompt-patterns.md).

## Agent-specific adapters

When a target is specified, adjust:
- **Claude:** XML scaffold; place long documents at the top; instructions at the end; avoid manual chain-of-thought; rely on adaptive thinking.
- **GPT-5.x:** prefer CTCO (Context-Task-Constraints-Output); strip persona padding; favor strict output formats (JSON schemas) for evaluability.
- **Gemini:** multimodal-aware; explicit format expected; temperature is provider-managed in newer revisions.
- **Local LLMs:** shorter prompts, more explicit constraints, simpler structure, prefer plain markdown over XML.
- **Coding agents:** declare file boundaries, acceptance criteria, tests, edit constraints.
- **Research agents:** require citations, source diversity, recency checks, explicit uncertainty.
- **Tool agents:** declare when to use tools, when not to, how to recover from errors.

Full table: [agent-compatibility](references/agent-compatibility.md).

## Local CLI utility (optional companion)

This Skill ships with a Node.js CLI for deterministic baseline scaffolding without an LLM call:

```
npx aiprompting doctor
npx aiprompting improve --prompt "Write me a better sales email"
npx aiprompting improve --file prompt.txt --mode diagnostic
```

The CLI is useful for: smoke-testing the package, batch-processing prompts in CI, getting a deterministic baseline you can then refine semantically. The richer rewrite happens *inside the host agent* using the instructions on this page.

## References (load only when needed)

- [prompt-quality-rubric.md](references/prompt-quality-rubric.md) — 9-category, 100-point scoring rubric.
- [prompt-patterns.md](references/prompt-patterns.md) — task-specific scaffolds (research / coding / agentic / extraction / writing / analysis).
- [clarification-policy.md](references/clarification-policy.md) — when to ask, how to ask.
- [cost-control.md](references/cost-control.md) — token-budget rules per mode.
- [agent-compatibility.md](references/agent-compatibility.md) — adapter notes per target agent.
