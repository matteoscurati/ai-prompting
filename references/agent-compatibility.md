# Agent compatibility

Adapter notes per target. Apply only when the user names a target; otherwise default to vendor-neutral XML scaffold (works on Claude, GPT, Gemini, most local models).

## Claude (Anthropic)

- **XML scaffold is native.** Claude treats `<role>`, `<context>`, `<task>` etc. as semantic boundaries.
- **Long context:** put documents *first*, instructions *last*. Queries at the end can improve quality up to ~30% on multi-document tasks.
- **Quote-then-answer:** for long documents, ask Claude to first extract relevant `<quotes>`, then answer based on them.
- **Adaptive thinking:** do not add explicit "think step by step" — Claude 4.x reasons adaptively. If reasoning is shallow, raise the `effort` parameter rather than prompt-around.
- **Literal interpretation:** Claude 4.7 follows instructions literally; state scope explicitly ("apply to every section, not just the first").
- **Tool use:** "Use this tool when…" works better than "CRITICAL: you MUST use this tool".
- **Code review harnesses:** ask for *coverage* not *filtering* at the find stage; filter downstream.
- **Subagents:** Claude 4.7 spawns fewer by default; prompt explicitly when fan-out is desired.

## OpenAI / GPT-5.x

- **CTCO pattern:** Context → Task → Constraints → Output. Reliable scaffold.
- **Strip persona padding:** GPT-5.x treats "you are a world-class expert" as noise.
- **Strict output formats:** prefer JSON schemas / Structured Outputs for evaluability.
- **Reasoning:** GPT-5 thinks internally; do not request "think step by step" in instant mode.
- **Tool use:** declare a TODO/plan tool for long agentic rollouts; provide preambles before major tool decisions.
- **Caching:** front-load fixed content; variable content at the bottom — improves cache hit rates.

## Gemini

- **Multimodal-aware:** if the prompt could include images/audio, structure for it.
- **Explicit format:** Gemini benefits from declared output structure (JSON, table).
- **Temperature:** newer revisions manage temperature internally; do not over-tune from prompt side.

## Local LLMs (Llama, Qwen, Mistral, etc.)

- **Shorter prompts win.** Long XML scaffolds tax the limited context.
- **Explicit constraints over implicit norms.** Local models infer less.
- **Plain markdown over XML.** Many local models tokenize XML inefficiently.
- **Keep CoT instructions** if the model has no internal reasoning loop.
- **Provide examples** more often (few-shot) — local models follow patterns better than abstract instructions.

## Coding agents (Claude Code, Cursor, Aider, OpenAI Codex CLI)

- **Declare file boundaries:** "Modify only X.ts and Y.ts; do not touch tests/."
- **Acceptance criteria:** "Compiles without warnings; all existing tests pass; no new dependencies."
- **Edit constraints:** "Use Edit, not Write, when modifying existing files."
- **Tests:** require tests for every change; ask the agent to write them first if test-driven.
- **State management:** for long tasks, ask the agent to track progress in a structured file (tests.json, progress.md).

## Research agents

- **Citations required:** every non-trivial claim must cite a source.
- **Source diversity:** require N sources from M domain types.
- **Recency:** for time-sensitive topics, set a recency floor ("sources from last 24 months").
- **Uncertainty:** distinguish fact / inference / hypothesis explicitly.
- **No fabricated URLs:** "If you don't have a real URL, write `[no URL]`, not a guess."

## Tool agents

- **When to use:** declare per-tool conditions ("use search only when the answer requires recent or external info").
- **When NOT to use:** "Don't call tools when the answer is in the prompt."
- **Parallel calls:** "Independent tool calls go in parallel; dependent calls go sequentially."
- **Error handling:** "On tool error: retry once, then degrade to alternative or report."
- **No invented parameters:** "Never call a tool with placeholder or guessed values."

## Skill-based hosts (Claude Code Skills, OpenAI Apps SDK, etc.)

- **Trigger description matters most.** Front-load triggers and use cases in the SKILL/manifest description.
- **Keep entrypoint compact.** Push depth into `references/` to keep the host's context window cheap.
- **Compose well.** Don't duplicate other Skills' responsibilities; reference them.

## Cross-vendor neutral scaffold (default when no target specified)

```
<role>...</role>
<objective>...</objective>
<context>...</context>
<task>...</task>
<constraints>...</constraints>
<output_format>...</output_format>
<quality_bar>...</quality_bar>
```

This works acceptably on Claude, GPT, Gemini, and most local models. Specialize only when the user names a target.
