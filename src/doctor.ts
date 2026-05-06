import * as fs from 'node:fs';
import * as path from 'node:path';
import { DoctorCheck, DoctorReport } from './types';
import { improvePrompt } from './prompt-improver';

const REQUIRED_REFERENCES = [
  'prompt-quality-rubric.md',
  'prompt-patterns.md',
  'clarification-policy.md',
  'cost-control.md',
  'agent-compatibility.md',
];

function packageRoot(): string {
  let dir = __dirname;
  for (let i = 0; i < 6; i += 1) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(__dirname, '..', '..');
}

function checkNode(): DoctorCheck {
  const v = process.versions.node;
  const major = Number.parseInt(v.split('.')[0] || '0', 10);
  return {
    name: 'Node.js >= 18',
    ok: major >= 18,
    detail: `node ${v}`,
    fix: major >= 18 ? undefined : 'Upgrade Node.js to 18 or later.',
  };
}

function checkPackageJson(root: string): { check: DoctorCheck; pkg?: Record<string, unknown> } {
  const pj = path.join(root, 'package.json');
  if (!fs.existsSync(pj)) {
    return {
      check: {
        name: 'package.json present',
        ok: false,
        detail: pj,
        fix: 'Run from inside the ai-prompting package directory.',
      },
    };
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(pj, 'utf8')) as Record<string, unknown>;
    const bin = pkg.bin;
    const hasBin =
      typeof bin === 'string' ||
      (typeof bin === 'object' && bin !== null && 'ai-prompting' in (bin as Record<string, unknown>));
    return {
      pkg,
      check: {
        name: 'package.json valid + bin entry',
        ok: hasBin,
        detail: `version ${String(pkg.version || '?')}`,
        fix: hasBin ? undefined : 'Add a "bin": {"ai-prompting": "bin/ai-prompting"} entry.',
      },
    };
  } catch (e) {
    return {
      check: {
        name: 'package.json parses',
        ok: false,
        detail: String((e as Error).message || e),
        fix: 'Fix JSON syntax in package.json.',
      },
    };
  }
}

function checkSkillMd(root: string): DoctorCheck {
  const sk = path.join(root, 'SKILL.md');
  if (!fs.existsSync(sk)) {
    return { name: 'SKILL.md present', ok: false, detail: sk, fix: 'Create SKILL.md at the package root.' };
  }
  const text = fs.readFileSync(sk, 'utf8');
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) {
    return {
      name: 'SKILL.md frontmatter',
      ok: false,
      detail: 'No YAML frontmatter found.',
      fix: 'Add a YAML frontmatter block with name and description.',
    };
  }
  const fm = m[1];
  const hasName = /^name\s*:/m.test(fm);
  const hasDesc = /^description\s*:/m.test(fm);
  return {
    name: 'SKILL.md frontmatter (name, description)',
    ok: hasName && hasDesc,
    detail: `${hasName ? 'name ✓' : 'name ✗'}, ${hasDesc ? 'description ✓' : 'description ✗'}`,
    fix: hasName && hasDesc ? undefined : 'Frontmatter must contain `name` and `description`.',
  };
}

function checkReferences(root: string): DoctorCheck {
  const dir = path.join(root, 'references');
  if (!fs.existsSync(dir)) {
    return { name: 'references/ present', ok: false, fix: 'Create the references/ directory.' };
  }
  const missing = REQUIRED_REFERENCES.filter((f) => !fs.existsSync(path.join(dir, f)));
  return {
    name: 'references/ files',
    ok: missing.length === 0,
    detail: missing.length === 0 ? `${REQUIRED_REFERENCES.length}/${REQUIRED_REFERENCES.length}` : `missing: ${missing.join(', ')}`,
    fix: missing.length === 0 ? undefined : `Create the missing reference files in references/.`,
  };
}

function checkBin(root: string): DoctorCheck {
  const bin = path.join(root, 'bin', 'ai-prompting');
  if (!fs.existsSync(bin)) {
    return { name: 'bin/ai-prompting shim', ok: false, fix: 'Create the bin/ai-prompting shim script.' };
  }
  let executable = false;
  try {
    fs.accessSync(bin, fs.constants.X_OK);
    executable = true;
  } catch {
    executable = false;
  }
  return {
    name: 'bin/ai-prompting executable',
    ok: executable,
    detail: bin,
    fix: executable ? undefined : `chmod +x ${bin}`,
  };
}

function checkBuildArtifact(root: string): DoctorCheck {
  const candidates = [
    path.join(root, 'dist', 'src', 'cli.js'),
    path.join(root, 'dist', 'cli.js'),
  ];
  const found = candidates.find((p) => fs.existsSync(p));
  return {
    name: 'compiled CLI artifact (dist)',
    ok: !!found,
    detail: found || candidates.join(' | '),
    fix: found ? undefined : 'Run `npm run build` to compile TypeScript to dist/.',
  };
}

function checkSmokeTest(): DoctorCheck {
  try {
    const r = improvePrompt({ originalPrompt: 'help me with this' });
    const ok = r.improved.length > 50 && r.scores.delta > 0;
    return {
      name: 'smoke test (improvePrompt)',
      ok,
      detail: `improved length=${r.improved.length}, delta=${r.scores.delta}`,
      fix: ok ? undefined : 'Improver did not produce a longer/higher-scoring output for a vague input.',
    };
  } catch (e) {
    return {
      name: 'smoke test (improvePrompt)',
      ok: false,
      detail: String((e as Error).message || e),
      fix: 'improvePrompt threw — inspect src/prompt-improver.ts.',
    };
  }
}

export function runDoctor(): DoctorReport {
  const root = packageRoot();
  const checks: DoctorCheck[] = [];
  checks.push(checkNode());
  const pkgRes = checkPackageJson(root);
  checks.push(pkgRes.check);
  checks.push(checkSkillMd(root));
  checks.push(checkReferences(root));
  checks.push(checkBin(root));
  checks.push(checkBuildArtifact(root));
  checks.push(checkSmokeTest());
  const ok = checks.every((c) => c.ok);
  const pkg = pkgRes.pkg || {};
  return {
    ok,
    checks,
    nodeVersion: process.versions.node,
    packageVersion: typeof pkg.version === 'string' ? pkg.version : 'unknown',
  };
}

export function formatReport(report: DoctorReport): string {
  const lines: string[] = [];
  lines.push('AIPrompting Doctor');
  for (const c of report.checks) {
    const mark = c.ok ? '✓' : '✗';
    const detail = c.detail ? ` (${c.detail})` : '';
    lines.push(`${mark} ${c.name}${detail}`);
    if (!c.ok && c.fix) lines.push(`    fix: ${c.fix}`);
  }
  lines.push(`Status: ${report.ok ? 'OK' : 'FAIL'}`);
  lines.push(`Node: ${report.nodeVersion} | Package: ${report.packageVersion}`);
  return lines.join('\n');
}
