import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Tests run from dist/tests/, so the package root is two levels up.
const packageRoot = join(__dirname, '..', '..');
const skillContent = readFileSync(join(packageRoot, 'SKILL.md'), 'utf8');
const slashContent = readFileSync(
  join(packageRoot, '.claude', 'commands', 'improve.md'),
  'utf8'
);

/** Slice a markdown file down to a single `## heading` section. */
function section(md: string, heading: string): string {
  const start = md.indexOf(`\n## ${heading}`);
  assert.notEqual(start, -1, `heading "## ${heading}" not found`);
  const rest = md.slice(start + 1);
  const next = rest.indexOf('\n## ');
  return next === -1 ? rest : rest.slice(0, next);
}

test('SKILL.md: Italian follow-up choice markers present (2-choice)', () => {
  assert.match(skillContent, /\*\*Esegui\*\*[^—]*—\s*applica subito/);
  assert.match(skillContent, /\*\*Modifica\*\*[^—]*—\s*voglio raffinare/);
  // Esci was removed in favor of "no reply = exit"; assert it's gone.
  assert.doesNotMatch(skillContent, /\*\*Esci\*\*/);
});

test('SKILL.md: English follow-up choice markers present (2-choice)', () => {
  assert.match(skillContent, /\*\*Run\*\*[^—]*—\s*apply the improved prompt/);
  assert.match(skillContent, /\*\*Refine\*\*[^—]*—\s*ask me targeted questions/);
  // Exit was removed in favor of "no reply = exit"; assert it's gone.
  assert.doesNotMatch(skillContent, /\*\*Exit\*\*/);
});

test('SKILL.md: reference cross-links resolve to real anchors', () => {
  assert.match(skillContent, /references\/clarification-policy\.md#refinement-loop/);
  assert.match(skillContent, /references\/clarification-policy\.md#policy-overrides/);
});

// The slash command is an adapter, not a second copy of the procedure. Every
// assertion below is a *negative* one: it fails the moment someone inlines a
// piece of SKILL.md back into it. This replaces the old keep-both-in-sync test,
// which locked the duplication in place instead of preventing it.
test('Slash command: does not restate the procedure', () => {
  const forbidden: Array<[RegExp, string]> = [
    [/Cosa fai adesso\?/, 'Italian choice block'],
    [/What next\?/, 'English choice block'],
    [/## Prompt migliorato/, 'Italian output template'],
    [/## Improved prompt/, 'English output template'],
    [/<quality_bar>/, 'XML scaffold'],
    [/<role>/, 'XML scaffold'],
    [/respiro profondo/, 'padding phrase list'],
    [/world-class/, 'padding phrase list'],
    [/intent clarity 15/i, 'rubric weights'],
  ];
  for (const [re, what] of forbidden) {
    assert.doesNotMatch(
      slashContent,
      re,
      `${what} was inlined into the slash command — it belongs in SKILL.md only`
    );
  }
});

test('Slash command: delegates to SKILL.md and stays thin', () => {
  assert.match(slashContent, /SKILL\.md/, 'slash command must point at the canonical procedure');
  const lines = slashContent.split('\n').length;
  assert.ok(
    lines < 80,
    `slash command grew to ${lines} lines — it is an adapter; push procedure into SKILL.md`
  );
});

test('Slash command: flag table agrees with the SKILL.md Options table', () => {
  // SKILL.md rows: | `option` | `--flag` | values | default | effect |
  const canonical = new Map(
    [...section(skillContent, 'Options').matchAll(/^\|\s*`([A-Za-z]+)`\s*\|\s*`(--[a-z-]+)`\s*\|/gm)].map(
      (m) => [m[2], m[1]] as const
    )
  );
  // Slash command rows: | `--flag` | `option` |
  const adapter = new Map(
    [...slashContent.matchAll(/^\|\s*`(--[a-z-]+)`\s*\|\s*`([A-Za-z]+)`\s*\|/gm)].map(
      (m) => [m[1], m[2]] as const
    )
  );

  assert.ok(canonical.size >= 7, `expected >= 7 options in SKILL.md, got ${canonical.size}`);
  assert.deepEqual(
    [...adapter.keys()].sort(),
    [...canonical.keys()].sort(),
    'the slash command and SKILL.md expose different flag sets'
  );
  for (const [flag, option] of adapter) {
    assert.equal(
      option,
      canonical.get(flag),
      `${flag} maps to "${option}" in the slash command but "${canonical.get(flag)}" in SKILL.md`
    );
  }
});

test('clarification-policy.md: linked sections are anchored', () => {
  const policyPath = join(packageRoot, 'references', 'clarification-policy.md');
  const policy = readFileSync(policyPath, 'utf8');
  // SKILL.md links to these anchors; ensure they exist.
  assert.match(policy, /^## Refinement loop$/m);
  assert.match(policy, /^## Rendering$/m);
  assert.match(policy, /^## Policy overrides$/m);
});
