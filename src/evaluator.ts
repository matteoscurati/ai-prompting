import { RubricCategoryId, RubricCategoryScore, RubricScore } from './types';

const VAGUE_OPENERS = [
  /^\s*(please\s+)?help\s+me\b/i,
  /^\s*can\s+you\b/i,
  /^\s*do\s+something\b/i,
  /^\s*(write|make|do|create)\s+(me\s+)?(a|an|some)?\s*(thing|stuff|something|anything)\b/i,
  /^\s*aiutami\b/i,
  /^\s*puoi\b/i,
  /^\s*fammi\s+(qualcosa|una\s+cosa)\b/i,
];

const PADDING_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /you\s+are\s+(a\s+)?world[-\s]?class\b[^.]*\./gi, label: 'world-class persona padding' },
  { re: /take\s+a\s+deep\s+breath[^.]*\./gi, label: 'take-a-deep-breath padding' },
  { re: /you\s+are\s+(an?\s+)?(amazing|brilliant|genius|expert)\s+ai\b[^.]*\./gi, label: 'flattery padding' },
  { re: /think\s+step\s+by\s+step[^.]*\./gi, label: 'redundant CoT request (modern models reason adaptively)' },
  { re: /let'?s\s+think\s+(this\s+)?through\s+step\s+by\s+step[^.]*\./gi, label: 'redundant CoT request' },
  { re: /\bI\s+will\s+tip\s+you\b[^.]*\./gi, label: 'tipping bribe padding' },
  { re: /\bmy\s+(career|job|life)\s+depends\s+on\b[^.]*\./gi, label: 'guilt-trip padding' },
  // Italian variants
  { re: /\bsei\s+un'?(\s+)?esperto\s+(di\s+livello\s+)?mondiale\b[^.]*\./gi, label: 'world-class persona padding (it)' },
  { re: /\bsei\s+un'?(\s+)?(IA|AI|intelligenza\s+artificiale)\s+(brillante|geniale|straordinaria|eccezionale|fantastica)\b[^.]*\./gi, label: 'flattery padding (it)' },
  { re: /\bfai\s+un\s+respiro\s+(profondo|lento)\b[^.]*\./gi, label: 'take-a-deep-breath padding (it)' },
  { re: /\bpensa(ci)?\s+passo\s+(?:(?:per|dopo)\s+)?passo\b[^.]*\./gi, label: 'redundant CoT request (it)' },
  { re: /\bragiona\s+passo\s+(?:(?:per|dopo)\s+)?passo\b[^.]*\./gi, label: 'redundant CoT request (it)' },
  { re: /\bti\s+(darò|daro|pago|pagherò)\s+(una\s+mancia|del\s+denaro|di\s+più)\b[^.]*\./gi, label: 'tipping bribe padding (it)' },
  { re: /\b(la\s+mia|il\s+mio)\s+(carriera|lavoro|vita)\s+dipende\s+da\b[^.]*\./gi, label: 'guilt-trip padding (it)' },
];

const FORMAT_TOKENS = [
  'json',
  'xml',
  'yaml',
  'csv',
  'markdown',
  'table',
  'tabella',
  'schema',
  'bullet',
  'lista',
  'paragraph',
  'paragrafo',
  'output_format',
];

const TOOL_KEYWORDS = [
  'tool',
  'tools',
  'search',
  'cerca',
  'fetch',
  'cite',
  'citaz',
  'source',
  'fonte',
  'fonti',
  'reference',
  'riferimento',
  'web',
  'database',
];

const HALLUCINATION_GUARDS = [
  'do not invent',
  'do not make up',
  "don't invent",
  "don't make up",
  'non inventare',
  'non inventarti',
  'if unknown',
  'if you do not know',
  "if you don't know",
  'se non sai',
  'verify',
  'verifica',
  'cite',
  'cita',
  'cita la fonte',
  'distinguish facts',
  'distingui fatti',
  'mark assumptions',
  'segna le assunzioni',
];

const SUCCESS_CRITERIA_KEYWORDS = [
  'success criteria',
  'criteri di successo',
  'acceptance criteria',
  'criteri di accettazione',
  'definition of done',
  '<success_criteria',
  '<quality_bar',
];

const CONSTRAINT_KEYWORDS = [
  'must',
  'deve',
  'devi',
  'should not',
  'non deve',
  'never',
  'mai',
  'always',
  'sempre',
  'max',
  'min',
  'at least',
  'almeno',
  'no more than',
  'non più di',
  'forbid',
  'vietato',
  'limit',
  'limite',
];

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function countMatchesIn(lower: string, needles: string[]): number {
  let total = 0;
  for (const n of needles) {
    if (!n) continue;
    let idx = 0;
    while ((idx = lower.indexOf(n, idx)) !== -1) {
      total += 1;
      idx += n.length;
    }
  }
  return total;
}

function hasAnyIn(lower: string, needles: string[]): boolean {
  return needles.some((n) => n && lower.includes(n));
}

export function hasAny(text: string, needles: string[]): boolean {
  return hasAnyIn(text.toLowerCase(), needles);
}

export function wordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

const XML_TAG_RE_CACHE: Map<string, RegExp> = new Map();
function detectXmlTag(text: string, tag: string): boolean {
  let re = XML_TAG_RE_CACHE.get(tag);
  if (!re) {
    re = new RegExp(`<\\s*${tag}[\\s>]`, 'i');
    XML_TAG_RE_CACHE.set(tag, re);
  }
  return re.test(text);
}

function detectListItems(text: string): number {
  const numbered = (text.match(/^\s*\d+[.)]\s+\S/gm) || []).length;
  const bulleted = (text.match(/^\s*[-*•]\s+\S/gm) || []).length;
  return numbered + bulleted;
}

function detectRepetition(lower: string): number {
  const tokens = lower.match(/[a-z]{4,}/g) || [];
  if (tokens.length < 30) return 0;
  const phrases = new Map<string, number>();
  for (let i = 0; i + 2 < tokens.length; i += 1) {
    const tri = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`;
    phrases.set(tri, (phrases.get(tri) || 0) + 1);
  }
  let repeats = 0;
  for (const v of phrases.values()) if (v >= 3) repeats += 1;
  return repeats;
}

interface Features {
  text: string;
  lower: string;
  wc: number;
}

function scoreIntentClarity(f: Features): RubricCategoryScore {
  const max = 15;
  let score = 8;
  const reasons: string[] = [];

  const trimmed = f.text.trim();
  if (!trimmed) {
    return { id: 'intent_clarity', label: 'Intent clarity', max, score: 0, rationale: 'Empty prompt.' };
  }

  if (VAGUE_OPENERS.some((re) => re.test(trimmed))) {
    score -= 5;
    reasons.push('Vague opener detected.');
  }
  if (/^\s*[A-ZÀ-Ý][a-zà-ÿ]+/.test(trimmed) && !/^\s*(please|can|could|would)/i.test(trimmed)) {
    score += 3;
    reasons.push('Starts with concrete imperative or topic.');
  }
  if (detectXmlTag(f.text, 'objective') || /\bobjective\b|\bobiettivo\b|\bgoal\b/i.test(f.text)) {
    score += 3;
    reasons.push('Explicit objective present.');
  }
  if (f.wc < 5) {
    score -= 3;
    reasons.push('Too short to convey intent.');
  }

  return {
    id: 'intent_clarity',
    label: 'Intent clarity',
    max,
    score: clamp(score, 0, max),
    rationale: reasons.join(' ') || 'Baseline score.',
  };
}

function scoreContextSufficiency(f: Features): RubricCategoryScore {
  const max = 15;
  let score = 6;
  const reasons: string[] = [];

  if (detectXmlTag(f.text, 'context')) {
    score += 5;
    reasons.push('<context> tag present.');
  }
  if (/\bgiven\b|\bbackground\b|\bcontext\b|\bcontesto\b|\bdato\b|\bbackground:\b/i.test(f.text)) {
    score += 2;
    reasons.push('Context markers found.');
  }
  if (f.wc < 20) {
    score -= 4;
    reasons.push('Prompt too short to carry context.');
  } else if (f.wc >= 50 && f.wc <= 800) {
    score += 2;
    reasons.push('Prompt length in productive band.');
  } else if (f.wc > 1500) {
    score -= 2;
    reasons.push('Very long prompt — risk of context dilution.');
  }

  return {
    id: 'context_sufficiency',
    label: 'Context sufficiency',
    max,
    score: clamp(score, 0, max),
    rationale: reasons.join(' ') || 'Baseline score.',
  };
}

function scoreTaskDecomposition(f: Features): RubricCategoryScore {
  const max = 10;
  let score = 4;
  const reasons: string[] = [];
  const items = detectListItems(f.text);

  if (detectXmlTag(f.text, 'task') || detectXmlTag(f.text, 'process')) {
    score += 2;
    reasons.push('Task/process tag present.');
  }
  if (items >= 3) {
    score += 4;
    reasons.push(`${items} list items detected.`);
  } else if (items >= 1) {
    score += 2;
    reasons.push(`${items} list item(s) detected.`);
  } else if (f.wc > 80) {
    score -= 1;
    reasons.push('Long prompt without explicit steps.');
  }

  return {
    id: 'task_decomposition',
    label: 'Task decomposition',
    max,
    score: clamp(score, 0, max),
    rationale: reasons.join(' ') || 'Baseline score.',
  };
}

function scoreConstraintSpecificity(f: Features): RubricCategoryScore {
  const max = 10;
  let score = 3;
  const reasons: string[] = [];
  const hits = countMatchesIn(f.lower, CONSTRAINT_KEYWORDS);
  const numerics = (f.text.match(/\b\d+\s*(words?|parole|tokens?|chars?|caratteri|sentences?|frasi|bullets?|items?|lines?|righe)\b/gi) || []).length;

  if (detectXmlTag(f.text, 'constraints')) {
    score += 3;
    reasons.push('<constraints> tag present.');
  }
  if (hits >= 3) {
    score += 2;
    reasons.push(`${hits} constraint keywords.`);
  }
  if (numerics >= 1) {
    score += 2;
    reasons.push(`${numerics} numeric quantifiers.`);
  }

  return {
    id: 'constraint_specificity',
    label: 'Constraint specificity',
    max,
    score: clamp(score, 0, max),
    rationale: reasons.join(' ') || 'Baseline score.',
  };
}

function scoreOutputFormat(f: Features): RubricCategoryScore {
  const max = 15;
  let score = 4;
  const reasons: string[] = [];
  const hasFormatTag = detectXmlTag(f.text, 'output_format') || detectXmlTag(f.text, 'output');

  if (hasFormatTag) {
    score += 6;
    reasons.push('<output_format> tag present.');
  }
  const formatHits = countMatchesIn(f.lower, FORMAT_TOKENS);
  if (formatHits >= 1) {
    score += Math.min(4, formatHits);
    reasons.push(`${formatHits} format token(s).`);
  }
  if (/```/.test(f.text) || /\{\s*"\w+"\s*:/.test(f.text)) {
    score += 2;
    reasons.push('Code block or JSON-like example present.');
  }
  if (formatHits === 0 && !hasFormatTag && f.wc > 40) {
    score -= 3;
    reasons.push('No output format specified.');
  }

  return {
    id: 'output_format_clarity',
    label: 'Output format clarity',
    max,
    score: clamp(score, 0, max),
    rationale: reasons.join(' ') || 'Baseline score.',
  };
}

function scoreToolSource(f: Features): RubricCategoryScore {
  const max = 10;
  let score = 3;
  const reasons: string[] = [];
  const hits = countMatchesIn(f.lower, TOOL_KEYWORDS);

  if (detectXmlTag(f.text, 'tools')) {
    score += 4;
    reasons.push('<tools> tag present.');
  }
  if (hits >= 2) {
    score += 3;
    reasons.push(`${hits} tool/source keyword(s).`);
  } else if (hits === 1) {
    score += 1;
    reasons.push('1 tool/source keyword.');
  }

  return {
    id: 'tool_source_instructions',
    label: 'Tool/source instructions',
    max,
    score: clamp(score, 0, max),
    rationale: reasons.join(' ') || 'Baseline score.',
  };
}

function scoreRobustness(f: Features): RubricCategoryScore {
  const max = 10;
  let score = 3;
  const reasons: string[] = [];
  const hits = countMatchesIn(f.lower, HALLUCINATION_GUARDS);

  if (hits >= 2) {
    score += 5;
    reasons.push(`${hits} hallucination guard(s).`);
  } else if (hits === 1) {
    score += 2;
    reasons.push('1 hallucination guard.');
  }
  if (/\bconfidence\b|\bconfidenza\b|\buncertainty\b|\bincertezza\b/i.test(f.text)) {
    score += 2;
    reasons.push('Uncertainty handling requested.');
  }

  return {
    id: 'robustness_hallucination',
    label: 'Robustness vs hallucination',
    max,
    score: clamp(score, 0, max),
    rationale: reasons.join(' ') || 'Baseline score.',
  };
}

function scoreTokenEfficiency(f: Features): RubricCategoryScore {
  const max = 10;
  let score = 7;
  const reasons: string[] = [];
  let paddingHits = 0;
  for (const p of PADDING_PATTERNS) {
    const m = f.text.match(p.re);
    if (m) paddingHits += m.length;
  }
  if (paddingHits > 0) {
    score -= Math.min(5, paddingHits * 2);
    reasons.push(`${paddingHits} padding phrase(s).`);
  }
  const reps = detectRepetition(f.lower);
  if (reps > 0) {
    score -= Math.min(3, reps);
    reasons.push(`${reps} repeated trigram(s).`);
  }
  if (f.wc > 1200) {
    score -= 2;
    reasons.push('Verbose prompt.');
  }

  return {
    id: 'token_efficiency',
    label: 'Token efficiency',
    max,
    score: clamp(score, 0, max),
    rationale: reasons.join(' ') || 'Baseline score.',
  };
}

function scoreEvaluationCriteria(f: Features): RubricCategoryScore {
  const max = 5;
  let score = 1;
  const reasons: string[] = [];
  if (hasAnyIn(f.lower, SUCCESS_CRITERIA_KEYWORDS)) {
    score += 4;
    reasons.push('Success criteria present.');
  }
  return {
    id: 'evaluation_criteria',
    label: 'Evaluation criteria',
    max,
    score: clamp(score, 0, max),
    rationale: reasons.join(' ') || 'No success criteria detected.',
  };
}

const SCORERS: Array<(f: Features) => RubricCategoryScore> = [
  scoreIntentClarity,
  scoreContextSufficiency,
  scoreTaskDecomposition,
  scoreConstraintSpecificity,
  scoreOutputFormat,
  scoreToolSource,
  scoreRobustness,
  scoreTokenEfficiency,
  scoreEvaluationCriteria,
];

export function scorePrompt(text: string): RubricScore {
  const safe = typeof text === 'string' ? text : '';
  const features: Features = { text: safe, lower: safe.toLowerCase(), wc: wordCount(safe) };
  const categories = SCORERS.map((fn) => fn(features));
  const total = categories.reduce((a, c) => a + c.score, 0);
  const max = categories.reduce((a, c) => a + c.max, 0);
  return { total, max, categories };
}

export function categoryById(score: RubricScore, id: RubricCategoryId): RubricCategoryScore | undefined {
  return score.categories.find((c) => c.id === id);
}

export function detectPaddingPhrases(text: string): Array<{ phrase: string; label: string }> {
  const out: Array<{ phrase: string; label: string }> = [];
  for (const p of PADDING_PATTERNS) {
    const matches = text.match(p.re);
    if (!matches) continue;
    for (const m of matches) out.push({ phrase: m.trim(), label: p.label });
  }
  return out;
}

export const _internals = {
  VAGUE_OPENERS,
  PADDING_PATTERNS,
  FORMAT_TOKENS,
  TOOL_KEYWORDS,
  HALLUCINATION_GUARDS,
  SUCCESS_CRITERIA_KEYWORDS,
  CONSTRAINT_KEYWORDS,
};
