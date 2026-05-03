import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { improvePrompt, detectLanguage, inferTaskType } from '../src/prompt-improver';

test('improvePrompt: empty input returns clarification request', () => {
  const r = improvePrompt({ originalPrompt: '' });
  assert.equal(r.needsClarification, true);
  assert.ok(r.clarifications.length > 0);
  assert.ok(r.improved.length > 0);
});

test('improvePrompt: vague input produces a positive delta', () => {
  const r = improvePrompt({ originalPrompt: 'help me' });
  assert.ok(r.scores.delta > 0, `expected positive delta, got ${r.scores.delta}`);
  assert.ok(r.improved.includes('<role>'));
  assert.ok(r.improved.includes('<task>'));
  assert.ok(r.improved.includes('<output_format>'));
});

test('improvePrompt: padding is removed from generated output', () => {
  const r = improvePrompt({
    originalPrompt: 'You are a world-class expert. Take a deep breath. Write me a sales email.',
  });
  assert.ok(!/world-class/i.test(r.improved), 'padding "world-class" should be stripped');
  assert.ok(!/take a deep breath/i.test(r.improved), 'padding "take a deep breath" should be stripped');
  assert.ok(r.changes.some((c) => c.type === 'removed_padding'),
    'expected at least one removed_padding change');
});

test('improvePrompt: mode is preserved in the result', () => {
  for (const mode of ['final_only', 'compact', 'standard', 'diagnostic'] as const) {
    const r = improvePrompt({ originalPrompt: 'do something useful', outputMode: mode });
    assert.equal(r.mode, mode);
  }
});

test('improvePrompt: assumptions surfaced when context missing', () => {
  const r = improvePrompt({ originalPrompt: 'Summarize the document.' });
  assert.ok(r.assumptions.length > 0, 'expected assumptions to be surfaced');
});

test('improvePrompt: high-risk domain triggers clarification', () => {
  const r = improvePrompt({ originalPrompt: 'Write a contract for legal compliance with GDPR.' });
  assert.equal(r.needsClarification, true);
  assert.ok(r.clarifications.length > 0);
});

test('improvePrompt: contradictions trigger clarification', () => {
  const r = improvePrompt({
    originalPrompt: 'Always use markdown but never use markdown in the output.',
  });
  assert.equal(r.needsClarification, true);
});

test('improvePrompt: askClarifyingQuestions=never suppresses questions', () => {
  const r = improvePrompt({
    originalPrompt: 'help',
    askClarifyingQuestions: 'never',
  });
  assert.equal(r.needsClarification, false);
});

test('improvePrompt: existing role section is preserved', () => {
  const r = improvePrompt({
    originalPrompt: '<role>Senior data scientist</role>\nDo the analysis.',
  });
  assert.ok(r.improved.includes('Senior data scientist'),
    'existing <role> content should be preserved');
});

test('detectLanguage: heuristic picks Italian on Italian markers', () => {
  assert.equal(detectLanguage('scrivi un prompt che sia più chiaro per il sistema'), 'it');
  assert.equal(detectLanguage('write a clearer prompt for the system'), 'en');
});

test('detectLanguage: explicit hint wins', () => {
  assert.equal(detectLanguage('write a clearer prompt', 'it'), 'it');
  assert.equal(detectLanguage('scrivi un prompt più chiaro', 'en'), 'en');
});

test('inferTaskType: coding keywords route to coding', () => {
  assert.equal(inferTaskType('Refactor this typescript function'), 'coding');
  assert.equal(inferTaskType('Estrai questi dati in JSON'), 'data-extraction');
  assert.equal(inferTaskType('Write me a blog post'), 'writing');
  assert.equal(inferTaskType('Just chat with me'), 'general');
});

test('improvePrompt: explicit taskType hint wins over inference', () => {
  const r = improvePrompt({
    originalPrompt: 'Refactor this function',
    taskType: 'writing',
  });
  assert.equal(r.taskType, 'writing');
});

test('improvePrompt: confidence reaches "high" for large deltas', () => {
  const r = improvePrompt({ originalPrompt: 'help' });
  assert.ok(r.scores.delta >= 30,
    `vague input should produce a delta >= 30, got ${r.scores.delta}`);
  assert.equal(r.scores.confidence, 'high',
    `expected confidence "high" for delta >= 30, got "${r.scores.confidence}"`);
});

test('improvePrompt: confidence is "medium" for mid deltas', () => {
  const alreadyDecent = `<role>Editor</role>
<task>Write a short blog post about TypeScript.</task>
<output_format>Markdown, 300 words.</output_format>`;
  const r = improvePrompt({ originalPrompt: alreadyDecent });
  if (r.scores.delta >= 10 && r.scores.delta < 30) {
    assert.equal(r.scores.confidence, 'medium');
  } else {
    assert.ok(r.scores.confidence === 'low' || r.scores.confidence === 'high',
      `delta ${r.scores.delta} should map to a defined confidence`);
  }
});
