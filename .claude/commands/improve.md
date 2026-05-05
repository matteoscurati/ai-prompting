---
description: Improve, rewrite, debug, or compress a prompt for any LLM agent. Applies the aiprompting Skill — strips padding, scaffolds with role/objective/context/task/constraints/output_format/quality_bar, scores 0-100, surfaces explicit assumptions. Use when the user asks to make a prompt better, more reliable, cheaper, clearer, structured, or model-specific.
argument-hint: <prompt to improve> [--mode final_only|compact|standard|diagnostic] [--target claude|openai|gemini|local]
allowed-tools: Read Bash
---

# /aiprompting:improve

Apply the **aiprompting** prompt-improvement procedure to the prompt the user supplies in `$ARGUMENTS`.

## Decision flow

1. **Read** `$ARGUMENTS` verbatim. If empty or only flags, ask the user for the prompt to improve.
2. **Parse flags** if present:
   - `--mode <name>` → `final_only` / `compact` / `standard` (default) / `diagnostic`
   - `--target <agent>` → adapter (`claude` / `openai` / `gemini` / `local` / `coding-agent` / `research-agent` / `tool-agent`)
   - `--task <type>` → forced task type, otherwise infer
   - If no `--mode` and the user says "solo prompt" / "just the prompt" / "no explanation", use `final_only`.
   - If no `--mode` and the user says "diagnose" / "spiegami" / "in dettaglio", use `diagnostic`.
3. **Detect language** from the prompt (Italian markers vs English). Output in the same language unless flagged otherwise.
4. **Classify task type**: research / writing / coding / analysis / data-extraction / agentic-workflow / creative / business / education / general.
5. **Identify missing critical info.** Ask up to **3** focused questions only if at least one of these is true:
   - Outcome is not inferable.
   - A required dependency is missing (audience, source files, schema, target platform, jurisdiction).
   - High-risk domain: legal, medical, financial advice, security/safety-critical, production systems, regulated content.
   - The prompt has contradictory instructions.
   - The user explicitly asks for a style/format that's underspecified.
   Otherwise: proceed with explicit `[ASSUMPTION: ...]` markers.
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
   Adapt to the declared target (Claude → keep XML; GPT-5.x → CTCO + strict output formats; Gemini → multimodal-aware; local LLMs → shorter, plain markdown).
8. **Score 0-100** using the rubric (intent clarity 15, context sufficiency 15, task decomposition 10, constraint specificity 10, output format clarity 15, tool/source instructions 10, robustness vs hallucination 10, token efficiency 10, evaluation criteria 5). Label as a heuristic estimate.
9. **Return** in the chosen mode (Italian template if the prompt was Italian):

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

## Optional: deterministic CLI fallback

If the user prefers a deterministic baseline (no LLM-side rewrite), or wants a fast precheck, you may run:

```bash
npx aiprompting improve --prompt "$ARGUMENTS" --mode standard
```

Use this only when the user explicitly asks for "deterministic" / "rule-based" / "no creativity" output. The CLI scaffolds and strips padding without semantic rewriting; the slash command's default behavior (semantic rewrite by you) is richer.

## References (load only when needed)

If the package is installed locally (e.g. as a Skill in `~/.claude/skills/aiprompting/` or a symlink), deeper guidance lives in `references/`:

- `references/prompt-quality-rubric.md` — full 100-point breakdown
- `references/prompt-patterns.md` — task-specific scaffolds
- `references/clarification-policy.md` — when to ask vs proceed
- `references/cost-control.md` — token-budget rules per mode
- `references/agent-compatibility.md` — adapter notes per target

Load them only if `--mode diagnostic` is requested or if a non-trivial adapter is needed.

---

**User input:** $ARGUMENTS
