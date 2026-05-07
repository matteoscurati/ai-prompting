---
description: Improve, rewrite, debug, or compress a prompt for any LLM agent. Applies the ai-prompting Skill — strips padding, scaffolds with role/objective/context/task/constraints/output_format/quality_bar, scores 0-100, surfaces explicit assumptions. Use when the user asks to make a prompt better, more reliable, cheaper, clearer, structured, or model-specific.
argument-hint: <prompt to improve> [--mode final_only|compact|standard|diagnostic] [--target claude|openai|gemini|local] [--task <type>] [--language it|en] [--audience "..."] [--token-budget minimal|balanced|generous] [--clarify auto|always|never]
allowed-tools: Read Bash
---

# /ai-prompting:improve

Apply the **ai-prompting** prompt-improvement procedure to the prompt the user supplies in `$ARGUMENTS`.

## Decision flow

1. **Read** `$ARGUMENTS` verbatim. If empty or only flags, ask the user for the prompt to improve.
2. **Parse flags** if present. Flags can appear in any position. Strip them from the prompt body before processing.
   - `--mode <name>` → `final_only` / `compact` / `standard` (default) / `diagnostic`.
   - `--target <agent>` → adapter (`claude` / `openai` / `gemini` / `local` / `coding-agent` / `research-agent` / `tool-agent`).
   - `--task <type>` → forced task type, otherwise infer.
   - `--language <code>` → force output language: `it` or `en`. Overrides auto-detection.
   - `--audience "<text>"` → audience descriptor; insert into `<context>` (e.g. `Audience: ML engineers, junior to mid-level.`). Quoted strings allowed.
   - `--token-budget <level>` → `minimal` / `balanced` (default) / `generous`. Under `minimal` drop `<context>` and `<quality_bar>` if not load-bearing, and inline constraints into `<task>`. Under `generous` add few-shot examples (3-5) and an expanded `<quality_bar>`.
   - `--clarify <policy>` → `auto` (default) / `always` / `never`. `always` forces up to 3 clarifying questions even when not strictly needed. `never` suppresses questions entirely and proceeds with explicit `[ASSUMPTION: ...]` markers — including in high-risk domains, where you must surface a stronger warning instead of asking.
   - **Natural-language fallbacks** (only when the matching flag is absent):
     - "solo prompt" / "just the prompt" / "no explanation" → `--mode final_only`.
     - "diagnose" / "spiegami" / "in dettaglio" / "perché" → `--mode diagnostic`.
     - "veloce" / "compatto" / "brief" → `--mode compact`.
     - "in italiano" / "in english" → `--language` accordingly.
     - "non chiedere" / "don't ask" → `--clarify never`.
     - "minimale" / "il più corto possibile" / "cheap" → `--token-budget minimal`.
3. **Detect language** from the prompt (Italian markers vs English) — but `--language` always wins.
4. **Classify task type**: research / writing / coding / analysis / data-extraction / agentic-workflow / creative / business / education / general.
5. **Identify missing critical info.** Honor `--clarify`:
   - `--clarify never` → never ask. Proceed with `[ASSUMPTION: ...]` markers. In high-risk domains, prepend a single warning line ("⚠ Dominio ad alto rischio: assunzioni non verificate.") and continue.
   - `--clarify always` → ask up to 3 focused questions even on simple prompts (still cap at 3, still prefer multiple-choice).
   - `--clarify auto` (default) → ask only if **at least one** is true: outcome not inferable; required dependency missing (audience, source files, schema, target platform, jurisdiction); high-risk domain (legal, medical, financial, security, production, regulated); contradictory instructions; underspecified style/format the user explicitly cares about. Otherwise proceed with explicit assumptions.
   If `--audience` is provided, do not ask the audience question — it's already specified.
   **Rendering preference**: when asking, use the host's structured-choice primitive (e.g. `AskUserQuestion` in Claude Code) instead of markdown MCQ. Markdown is the fallback for hosts without one (Codex CLI, Gemini CLI as of 2026).
6. **Strip padding**: remove "you are a world-class…", "take a deep breath", "I will tip you…", "think step by step" (counterproductive on modern reasoning models), and Italian variants ("sei un esperto di livello mondiale", "fai un respiro profondo", "pensaci passo passo", "ti darò una mancia").
7. **Rewrite** using the canonical XML scaffold (use plain markdown when simpler is enough):
   ```
   <role>...</role>
   <objective>...</objective>
   <context>...</context>
   <task>...</task>
   <constraints>...</constraints>
   <output_format>...</output_format>
   <quality_bar>...</quality_bar>
   ```
   - If `--audience "<text>"` was passed, embed it into `<context>` as `Audience: <text>.` (and skip the audience clarification question).
   - If `--token-budget minimal`: drop `<context>` and `<quality_bar>` when not strictly load-bearing; inline 1-2 most important constraints into `<task>` instead of a separate block.
   - If `--token-budget generous`: include 3-5 few-shot examples wrapped in `<example>` tags inside `<task>`; expand `<quality_bar>` with 2-3 verifiable acceptance checks.
   - Adapt to the declared target (Claude → keep XML; GPT-5.x → CTCO + strict output formats; Gemini → multimodal-aware; local LLMs → shorter, plain markdown).
8. **Score 0-100** using the rubric (intent clarity 15, context sufficiency 15, task decomposition 10, constraint specificity 10, output format clarity 15, tool/source instructions 10, robustness vs hallucination 10, token efficiency 10, evaluation criteria 5). Label as a heuristic estimate.
9. **Return** in the chosen mode. Output language: `--language` if set, else the auto-detected language. Italian template:

```
## Prompt migliorato
```text
<the improved prompt>
```

## Cosa è migliorato      (skip in final_only/compact)
- Chiarezza: ...
- Struttura: ...
- Vincoli: ...
- Output: ...

## Impatto stimato        (skip in final_only)
Originale: X/100
Migliorato: Y/100
Delta stimato: +Z
Confidenza: low|medium|high
Nota: stima euristica, non garanzia.

## Rubric (diagnostico)   (only in diagnostic mode)
- Intent clarity: a/15 — rationale
- Context sufficiency: b/15 — rationale
- ...

## Assunzioni             (skip in final_only/compact)
- ...
```

For English prompts, use `## Improved prompt / ## What improved / ## Estimated impact / ## Rubric (diagnostic) / ## Assumptions`.

10. **Offer execution.** After the output block, append a 2-choice prompt. Skip in `final_only` (raw output for piping); show in `compact` / `standard` / `diagnostic`.

    **Italian template:**

    ```
    ---
    ## Cosa fai adesso?
    1. **Esegui** — applica subito il prompt migliorato (solo il blocco "## Prompt migliorato", non il resto).
    2. **Modifica** — voglio raffinare prima; fammi domande mirate.

    _Non rispondere o scrivi qualcos'altro per chiudere il giro._
    ```

    **English template:**

    ```
    ---
    ## What next?
    1. **Run** — apply the improved prompt now (only the "## Improved prompt" block, not the rest).
    2. **Refine** — ask me targeted questions before running.

    _Reply with anything else (or nothing) to close out._
    ```

    **Behavior.** Choice 1 → treat the body of the `## Improved prompt` / `## Prompt migliorato` code block as the user's next turn; meta sections (Cosa è migliorato / Impatto stimato / Assunzioni / Rubric) are not part of that instruction. Choice 2 → enter the refinement loop (`references/clarification-policy.md#refinement-loop`); default cap 3 cycles, type `unlock` to keep refining. Anything else, or no reply → close gracefully without further prompting.

## Optional: deterministic CLI fallback

If the user prefers a deterministic baseline (no LLM-side rewrite), or wants a fast precheck, you may run:

```bash
npx ai-prompting improve --prompt "$ARGUMENTS" --mode standard
```

Use this only when the user explicitly asks for "deterministic" / "rule-based" / "no creativity" output. The CLI scaffolds and strips padding without semantic rewriting; the slash command's default behavior (semantic rewrite by you) is richer.

## References (load only when needed)

If the package is installed locally (e.g. as a Skill in `~/.claude/skills/ai-prompting/` or a symlink), deeper guidance lives in `references/`:

- `references/prompt-quality-rubric.md` — full 100-point breakdown
- `references/prompt-patterns.md` — task-specific scaffolds
- `references/clarification-policy.md` — when to ask vs proceed
- `references/cost-control.md` — token-budget rules per mode
- `references/agent-compatibility.md` — adapter notes per target

Load them only if `--mode diagnostic` is requested or if a non-trivial adapter is needed.

---

**User input:** $ARGUMENTS
