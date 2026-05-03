# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
