#!/usr/bin/env node
import * as fs from 'node:fs';
import * as path from 'node:path';
import { improvePrompt } from './prompt-improver';
import { formatReport, runDoctor } from './doctor';
import { ImprovementResult, OutputMode, PromptImproverOptions, TaskType, TokenBudget } from './types';

interface ParsedArgs {
  command: string;
  flags: Record<string, string | boolean>;
  positional: string[];
}

const VALID_MODES: OutputMode[] = ['final_only', 'compact', 'standard', 'diagnostic'];
const VALID_BUDGETS: TokenBudget[] = ['minimal', 'balanced', 'generous'];
const VALID_TASKS: TaskType[] = [
  'research',
  'writing',
  'coding',
  'analysis',
  'data-extraction',
  'agentic-workflow',
  'creative',
  'business',
  'education',
  'general',
];

function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  let command = '';
  let i = 0;
  if (argv.length > 0 && !argv[0].startsWith('-')) {
    command = argv[0];
    i = 1;
  }
  while (i < argv.length) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) {
        flags[key] = true;
        i += 1;
      } else {
        flags[key] = next;
        i += 2;
      }
    } else {
      positional.push(a);
      i += 1;
    }
  }
  return { command, flags, positional };
}

function printUsage(): void {
  const usage = `aiprompting — improve any prompt into a clearer, cheaper, more reliable version.

USAGE
  aiprompting doctor
  aiprompting improve --prompt "<text>" [options]
  aiprompting improve --file <path>     [options]
  cat prompt.txt | aiprompting improve   [options]

OPTIONS
  --prompt <text>           Inline prompt to improve.
  --file <path>             Read prompt from file.
  --mode <name>             final_only | compact | standard (default) | diagnostic
  --target <agent>          claude | openai | gpt | gemini | local | coding-agent
  --task <type>             ${VALID_TASKS.join(' | ')}
  --token-budget <level>    minimal | balanced (default) | generous
  --language <code>         it | en  (auto-detected if omitted)
  --audience <text>         Free-text audience description.
  --no-score                Suppress score block.
  --no-rationale            Suppress per-category rationale (diagnostic mode only).
  --version                 Print package version.
  --help                    Show this help.
`;
  process.stdout.write(usage);
}

function readPackageVersion(): string {
  try {
    const pj = path.resolve(__dirname, '..', '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pj, 'utf8')) as { version?: string };
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function readStdinSync(): string {
  if (process.stdin.isTTY) return '';
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function pickPrompt(flags: Record<string, string | boolean>): string {
  if (typeof flags.prompt === 'string') return flags.prompt;
  if (typeof flags.file === 'string') {
    const p = path.resolve(process.cwd(), flags.file);
    return fs.readFileSync(p, 'utf8');
  }
  return readStdinSync();
}

function pickFromUnion<T extends string>(v: unknown, allowed: readonly T[]): T | undefined {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

function buildOptions(flags: Record<string, string | boolean>, original: string): PromptImproverOptions {
  const opts: PromptImproverOptions = { originalPrompt: original };
  const mode = pickFromUnion(flags.mode, VALID_MODES);
  if (mode) opts.outputMode = mode;
  const task = pickFromUnion(flags.task, VALID_TASKS);
  if (task) opts.taskType = task;
  const budget = pickFromUnion(flags['token-budget'], VALID_BUDGETS);
  if (budget) opts.tokenBudget = budget;
  const language = pickFromUnion(flags.language, ['it', 'en'] as const);
  if (language) opts.language = language;
  if (typeof flags.target === 'string') opts.targetAgent = flags.target;
  if (typeof flags['target-model'] === 'string') opts.targetModel = flags['target-model'];
  if (typeof flags.audience === 'string') opts.audience = flags.audience;
  if (typeof flags.constraints === 'string') {
    opts.constraints = flags.constraints.split('|').map((s) => s.trim()).filter(Boolean);
  }
  return opts;
}

interface RenderStrings {
  clarifying: string;
  improvedPrompt: string;
  whatImproved: string;
  noChanges: string;
  estimatedImpact: string;
  original: string;
  improved: string;
  estimatedDelta: string;
  confidence: string;
  heuristicNote: string;
  rubric: string;
  assumptions: string;
}

const STRINGS: Record<'it' | 'en', RenderStrings> = {
  it: {
    clarifying: '## Domande di chiarimento',
    improvedPrompt: '## Prompt migliorato',
    whatImproved: '## Cosa è migliorato',
    noChanges: '- Nessuna modifica strutturale necessaria.',
    estimatedImpact: '## Impatto stimato',
    original: 'Originale',
    improved: 'Migliorato',
    estimatedDelta: 'Delta stimato',
    confidence: 'Confidenza',
    heuristicNote: 'Nota: stima euristica, non garanzia di performance.',
    rubric: '## Rubric (diagnostico)',
    assumptions: '## Assunzioni',
  },
  en: {
    clarifying: '## Clarifying questions',
    improvedPrompt: '## Improved prompt',
    whatImproved: '## What improved',
    noChanges: '- No structural changes needed.',
    estimatedImpact: '## Estimated impact',
    original: 'Original',
    improved: 'Improved',
    estimatedDelta: 'Estimated delta',
    confidence: 'Confidence',
    heuristicNote: 'Note: heuristic estimate, not a performance guarantee.',
    rubric: '## Rubric (diagnostic)',
    assumptions: '## Assumptions',
  },
};

function render(r: ImprovementResult, includeScore: boolean, includeRationale: boolean): string {
  const s = STRINGS[r.language];
  const mode = r.mode;
  const out: string[] = [];

  if (r.needsClarification && r.clarifications.length > 0 && mode !== 'final_only') {
    out.push(s.clarifying);
    for (const q of r.clarifications) {
      const qOpts = q.options ? ` (${q.options.join(' / ')})` : '';
      out.push(`- ${q.question}${qOpts}`);
    }
    out.push('');
  }

  out.push(s.improvedPrompt);
  out.push('```text');
  out.push(r.improved.trim());
  out.push('```');

  if (mode === 'final_only') return out.join('\n');

  if (mode !== 'compact') {
    out.push('');
    out.push(s.whatImproved);
    if (r.changes.length === 0) {
      out.push(s.noChanges);
    } else {
      const seen = new Set<string>();
      for (const c of r.changes) {
        const line = `- ${c.type}: ${c.detail}`;
        if (!seen.has(line)) {
          seen.add(line);
          out.push(line);
        }
      }
    }
  }

  if (includeScore) {
    out.push('');
    out.push(s.estimatedImpact);
    out.push(`${s.original}: ${r.scores.before.total}/${r.scores.before.max}`);
    out.push(`${s.improved}: ${r.scores.after.total}/${r.scores.after.max}`);
    out.push(`${s.estimatedDelta}: ${r.scores.delta >= 0 ? '+' : ''}${r.scores.delta}`);
    out.push(`${s.confidence}: ${r.scores.confidence}`);
    out.push(s.heuristicNote);
  }

  if (mode === 'diagnostic' && includeRationale) {
    out.push('');
    out.push(s.rubric);
    for (const c of r.scores.after.categories) {
      out.push(`- ${c.label}: ${c.score}/${c.max} — ${c.rationale}`);
    }
  }

  if (r.assumptions.length > 0 && mode !== 'compact') {
    out.push('');
    out.push(s.assumptions);
    for (const a of r.assumptions) out.push(`- ${a}`);
  }

  return out.join('\n');
}

function main(argv: string[]): number {
  const parsed = parseArgs(argv);
  if (parsed.flags.help || parsed.command === 'help') {
    printUsage();
    return 0;
  }
  if (parsed.flags.version || parsed.command === 'version') {
    process.stdout.write(`${readPackageVersion()}\n`);
    return 0;
  }

  if (parsed.command === 'doctor' || parsed.command === '') {
    if (parsed.command === '') {
      printUsage();
      return 1;
    }
    const report = runDoctor();
    process.stdout.write(formatReport(report) + '\n');
    return report.ok ? 0 : 1;
  }

  if (parsed.command === 'improve') {
    const original = pickPrompt(parsed.flags);
    if (!original.trim()) {
      process.stderr.write('aiprompting: no prompt provided. Use --prompt, --file, or pipe via stdin.\n\n');
      printUsage();
      return 1;
    }
    const opts = buildOptions(parsed.flags, original);
    const result = improvePrompt(opts);
    const includeScore = !(parsed.flags['no-score'] === true);
    const includeRationale = !(parsed.flags['no-rationale'] === true);
    process.stdout.write(render(result, includeScore, includeRationale) + '\n');
    return 0;
  }

  process.stderr.write(`aiprompting: unknown command "${parsed.command}".\n\n`);
  printUsage();
  return 1;
}

if (require.main === module) {
  process.exit(main(process.argv.slice(2)));
}

export { main, parseArgs, render };
