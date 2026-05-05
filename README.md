# aiprompting

Improve, rewrite, debug, evaluate, and compress prompts for any LLM agent.

`aiprompting` ships in two layers:

- **A Skill (`SKILL.md` + `references/`)** — natural-language instructions an agent (Claude, GPT, Gemini, local) follows to rewrite the user's prompt using its own model.
- **A Node.js CLI (`npx aiprompting`)** — deterministic, no API keys, no LLM calls. It scores prompts with a 100-point heuristic rubric, applies rule-based scaffolding, and exposes a `doctor` command for installation health.

The CLI is the verifiable baseline. The Skill is where the semantic gains happen.

## Install

Requires Node.js ≥ 18.

From npm (when published):

```bash
npx aiprompting doctor
npx aiprompting improve --prompt "Write me a better sales email"
```

From source:

```bash
git clone <repo>
cd aiprompting
npm install
npm run build
node dist/src/cli.js doctor
```

## Usage

### CLI

```bash
aiprompting improve --prompt "Help me write something good"
aiprompting improve --file ./prompt.txt
aiprompting improve --prompt "..." --mode final_only
aiprompting improve --prompt "..." --target claude --task research --token-budget minimal
cat prompt.txt | aiprompting improve --mode diagnostic
aiprompting doctor
aiprompting --help
```

#### Flags

| Flag | Values | Default |
|---|---|---|
| `--prompt <text>` | inline prompt | — |
| `--file <path>` | read from file | — |
| `--mode <name>` | `final_only` / `compact` / `standard` / `diagnostic` | `standard` |
| `--target <agent>` | claude / openai / gpt / gemini / local / coding-agent / research-agent / tool-agent | — |
| `--task <type>` | research / writing / coding / analysis / data-extraction / agentic-workflow / creative / business / education / general | inferred |
| `--token-budget <level>` | `minimal` / `balanced` / `generous` | `balanced` |
| `--language <code>` | `it` / `en` | auto-detect |
| `--audience <text>` | free-text audience description | — |
| `--constraints <list>` | pipe-separated constraints | — |
| `--no-score` | suppress score block | — |
| `--no-rationale` | suppress per-category rationale (diagnostic mode) | — |
| `--version` | print package version | — |
| `--help` | print help | — |

### Library API

```ts
import { improvePrompt, scorePrompt, runDoctor } from 'aiprompting';

const result = improvePrompt({
  originalPrompt: 'Help me write a better sales email',
  taskType: 'writing',
  outputMode: 'standard',
  language: 'it',
});

console.log(result.improved);          // the rewritten prompt
console.log(result.scores);             // before/after/delta
console.log(result.assumptions);        // explicit assumptions
console.log(result.clarifications);     // up to 3 questions if needed
```

## Output modes

| Mode | What you get |
|---|---|
| `final_only` | Only the improved prompt block (lowest token cost). |
| `compact` | Improved prompt + 1-line score. |
| `standard` *(default)* | Improved prompt + change list + score + assumptions. |
| `diagnostic` | Standard + per-category rubric breakdown. |

## How the rubric works

100 points across 9 categories. See [references/prompt-quality-rubric.md](references/prompt-quality-rubric.md) for the full breakdown. Scores are heuristic estimates, not guaranteed performance gains.

## Doctor

```
$ aiprompting doctor
AIPrompting Doctor
✓ Node.js >= 18 (node v20.10.0)
✓ package.json valid + bin entry (version 0.1.0)
✓ SKILL.md frontmatter (name, description) (name ✓, description ✓)
✓ references/ files (5/5)
✓ bin/aiprompting executable (/.../bin/aiprompting)
✓ compiled CLI artifact (dist) (/.../dist/src/cli.js)
✓ smoke test (improvePrompt) (improved length=842, delta=43)
Status: OK
Node: 20.10.0 | Package: 0.1.0
```

If a check fails, the doctor prints a `fix:` line for it.

## How the Skill is consumed by an agent

In a Claude Code / Skill-aware host, the agent reads `SKILL.md`, may load any of the `references/*.md` if it needs depth, and applies the procedure to the user's prompt. The CLI is not invoked by the agent — it's a developer / CI utility.

`agents/openai.yaml` is an opt-in manifest for OpenAI-style agent hosts. It's not required by Claude.

## Slash command

A slash command shipped at `.claude/commands/improve.md` lets compatible hosts invoke the Skill explicitly:

```
/improve <prompt to improve> [--mode standard|diagnostic|compact|final_only] [--target claude|openai|gemini|local]
```

To install at user level (so the command is available globally, namespaced as `/aiprompting:improve`):

```bash
npm run install-command            # installs into every detected host directory
npm run install-command -- --list  # show targets and supported hosts
npm run install-command -- --host claude --force
```

Currently auto-detects: Claude Code (`~/.claude/commands/`), OpenAI Codex CLI (`~/.codex/commands/`), Cursor (`~/.cursor/commands/`). Any other host that reads markdown command files from a known directory can be added in `scripts/install-command.js`.

## Upgrade path

- Versioning is semver. Track changes in [CHANGELOG.md](CHANGELOG.md).
- Adding a new task type → update `TASK_TYPE_HINTS`, `ROLE_BY_TASK`, `OUTPUT_FORMAT_BY_TASK` in `src/prompt-improver.ts`, plus a section in `references/prompt-patterns.md`.
- Adding a new agent target → extend `references/agent-compatibility.md` and document any heuristic in `src/prompt-improver.ts` (keep model-specific advice in references, not in core logic).
- Adjusting the rubric → update `src/evaluator.ts` *and* `references/prompt-quality-rubric.md` together.

## Limitations

- The CLI's improvement is **deterministic and rule-based**. It guarantees structural scaffolding and padding removal; it does not perform semantic rewriting (a host agent does that).
- Scores are heuristic estimates. Reliable measurement requires a golden test set on real models.
- Italian language detection uses a small marker set; pass `--language en|it` for certainty.
- The Skill description is dense to maximize triggering precision; tune for your host if needed.

## Troubleshooting

- **`bin/aiprompting`: build artifact not found** — run `npm run build` inside the package.
- **`tsc: command not found`** — run `npm install` first to install the TypeScript devDependency.
- **`npm test` fails after a manual edit** — the test runner expects compiled output; tests are TS that compile to `dist/tests/*.test.js` and run there.

## License

MIT — see [LICENSE](LICENSE).
