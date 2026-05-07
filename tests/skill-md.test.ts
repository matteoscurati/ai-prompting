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

test('SKILL.md: refinement-loop cross-reference present', () => {
  assert.match(
    skillContent,
    /references\/clarification-policy\.md#refinement-loop/
  );
});

test('Slash command: choice markers present (it + en, 2-choice)', () => {
  for (const marker of ['Esegui', 'Modifica', 'Run', 'Refine']) {
    assert.match(
      slashContent,
      new RegExp(`\\*\\*${marker}\\*\\*`),
      `slash command missing marker **${marker}**`
    );
  }
  // The 3rd choice (Esci/Exit) was removed; ensure it's gone.
  assert.doesNotMatch(slashContent, /\*\*Esci\*\*/);
  assert.doesNotMatch(slashContent, /\*\*Exit\*\*/);
});

test('clarification-policy.md: refinement-loop and rendering sections anchored', () => {
  const policyPath = join(packageRoot, 'references', 'clarification-policy.md');
  const policy = readFileSync(policyPath, 'utf8');
  // SKILL.md and improve.md both link to these anchors; ensure they exist.
  assert.match(policy, /^## Refinement loop$/m);
  assert.match(policy, /^## Rendering$/m);
});
