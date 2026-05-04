# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] — 2026-05-04

End-to-end testing on real Italian prompts surfaced two limitations of the
deterministic baseline. Both fixed without LLM dependency.

### Added
- Italian padding patterns in `evaluator.ts::PADDING_PATTERNS` covering:
  world-class persona ("sei un esperto di livello mondiale"), flattery ("sei
  un'IA brillante/geniale"), take-a-deep-breath ("fai un respiro profondo"),
  redundant CoT ("pensaci passo passo", "ragiona passo per passo"), tipping
  bribes ("ti darò una mancia"), guilt-trip ("la mia carriera dipende da").
- `nominalizeImperative()` in `prompt-improver.ts` strips imperative-help
  openers (`aiutami a / help me / can you / puoi / fammi / dammi`) when they
  appear at the start of a candidate objective, then capitalizes the
  remainder. Turns "Aiutami a scrivere una mail" into "Scrivere una mail" in
  `<objective>`.
- `extractObjective()` now skips padding-like sentences (`PADDING_LIKE_SENTENCE_RE`)
  before picking the first usable sentence, so persona padding can no longer
  leak into the objective even if a regex misses one variant.
- 4 regression tests covering Italian padding removal and objective
  nominalization (it/en).

### Fixed
- Italian persona padding ("Sei un esperto di livello mondiale...") leaking
  into the `<objective>` field of the generated prompt.
- "Aiutami a / Help me" openers being preserved as-is in `<objective>` when
  they should be transformed into nominal outcome statements.

## [0.1.0] — 2026-05-03

Initial release.

### Added
- `SKILL.md` with the canonical Skill frontmatter and the 8-step decision flow.
- 5 `references/` files: `prompt-quality-rubric.md`, `prompt-patterns.md`,
  `clarification-policy.md`, `cost-control.md`, `agent-compatibility.md`.
- TypeScript core (Node 18+, no runtime dependencies):
  - `evaluator.ts` — 9-category, 100-point heuristic rubric.
  - `prompt-improver.ts` — deterministic XML-scaffold rewrite, padding removal,
    language and task-type detection, clarification-need detection.
  - `doctor.ts` — installation/health checks with remediation hints.
  - `cli.ts` — argv parser with no dependencies; supports `doctor`, `improve`,
    `--mode`, `--target`, `--task`, `--token-budget`, `--language`, `--audience`,
    `--no-score`, `--no-rationale`, `--version`, `--help`; reads stdin when no
    `--prompt`/`--file` is provided.
  - `index.ts` — public library API.
- `bin/aiprompting` shebang shim with a clear error when `dist/` is missing.
- `agents/openai.yaml` — opt-in manifest for OpenAI-style hosts.
- 4 example prompts under `examples/`.
- Tests with `node --test` for evaluator, prompt-improver, doctor.
- README with NPX install path, CLI flags, library API, upgrade flow.
