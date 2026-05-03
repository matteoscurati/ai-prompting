# Clarification policy

The default is **proceed with explicit assumptions**. Asking is the exception, not the rule. Each question costs the user time and tokens; ask only when the answer materially changes the rewrite.

## When to ask

Ask when **at least one** of these is true:

1. **Outcome is unrecoverable from context.** The desired output cannot be inferred even charitably (e.g. prompt is "make it better" with no referent).
2. **A required dependency is missing.** Source files, audience, target tool/platform, data schema, jurisdiction — items that change the structure of the answer, not its surface.
3. **High-risk domain.** Legal, medical, financial advice, security/safety-critical code, production deployment, business-critical decisions, regulated content.
4. **Contradictory instructions.** The prompt says both "always X" and "never X", or "use markdown" and "no markdown", etc.
5. **Underspecified style/format the user explicitly cares about.** They asked for "in our brand voice" without providing the voice.

## When NOT to ask

Do not ask when:
- The answer is inferable from context with a reasonable assumption.
- The question would be answered by reading a file the user has already mentioned.
- The risk of getting it wrong is low (the user can iterate).
- You would be asking just to be safe; default to acting and surfacing assumptions.

## How to ask

- **Maximum 3 questions** in one turn.
- Prefer **multiple-choice** or **short-answer** to reduce friction.
- Group related questions; never ask the same thing twice.
- Briefly explain *why* a question matters only if non-obvious.
- Do **not** echo the user's prompt back at them; show you've read it.

### Format

```
## Domande di chiarimento
- {question 1} (option A / option B / option C)
- {question 2}
- {question 3}
```

Or in English:

```
## Clarifying questions
- {question 1} (option A / option B / option C)
- ...
```

## When to proceed despite uncertainty

When the policy says "do not ask" but you still have unknowns:
- Pick the most charitable interpretation.
- Add an explicit `[ASSUMPTION: ...]` line in the improved prompt.
- List assumptions in the `## Assunzioni` / `## Assumptions` section of the response.
- The user can correct in the next turn at low cost.

## Examples

**Ask:**
- "Generate API docs" → for which language? for which framework? Is there an existing OpenAPI spec?
- "Write the contract" → which jurisdiction? this is high-risk legal.
- "Do X but never X" → contradiction; ask which one wins.

**Do not ask:**
- "Write a sales email for our SaaS product" → assume B2B mid-market unless contradicted; surface as assumption.
- "Translate this to Italian" → just translate; ask only if a tone/register is requested without spec.
- "Improve my prompt" with a long, well-structured prompt attached → infer task type, proceed, surface light assumptions.

## Anti-pattern: clarification creep

If the user has given you any executable starting point, **act first**, ask second. A flawed first pass that surfaces assumptions is faster to correct than a question loop. Only loop on questions when the cost of wrong is high (see "high-risk domain" above).
