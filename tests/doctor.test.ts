import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { runDoctor, formatReport } from '../src/doctor';

test('runDoctor: returns a report with all checks', () => {
  const r = runDoctor();
  assert.ok(Array.isArray(r.checks), 'checks is array');
  assert.ok(r.checks.length >= 6, `expected ≥6 checks, got ${r.checks.length}`);
  assert.ok(typeof r.nodeVersion === 'string');
  assert.ok(typeof r.packageVersion === 'string');
});

test('runDoctor: Node check passes on Node 18+', () => {
  const r = runDoctor();
  const node = r.checks.find((c) => c.name.startsWith('Node.js'));
  assert.ok(node);
  assert.equal(node!.ok, true, `expected Node check to pass, detail=${node!.detail}`);
});

test('runDoctor: smoke test (improvePrompt) passes', () => {
  const r = runDoctor();
  const smoke = r.checks.find((c) => c.name.includes('smoke test'));
  assert.ok(smoke);
  assert.equal(smoke!.ok, true, `smoke test should pass: ${smoke!.detail || ''}`);
});

test('runDoctor: SKILL.md and references are present in the package', () => {
  const r = runDoctor();
  const skill = r.checks.find((c) => c.name.startsWith('SKILL.md'));
  const refs = r.checks.find((c) => c.name.startsWith('references/'));
  assert.ok(skill);
  assert.ok(refs);
  assert.equal(skill!.ok, true, `SKILL.md should be valid: ${skill!.detail || ''}`);
  assert.equal(refs!.ok, true, `references should be present: ${refs!.detail || ''}`);
});

test('formatReport: produces human-readable output', () => {
  const r = runDoctor();
  const txt = formatReport(r);
  assert.ok(txt.includes('AIPrompting Doctor'));
  assert.ok(txt.includes('Status:'));
  assert.ok(txt.includes('Node:'));
});
