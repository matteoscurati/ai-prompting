import { detectPaddingPhrases, hasAny, scorePrompt, wordCount } from './evaluator';
import {
  ClarificationQuestion,
  ImprovementChange,
  ImprovementResult,
  OutputMode,
  PromptImproverOptions,
  TaskType,
} from './types';

const ITALIAN_MARKERS = [
  /\b(è|perché|però|già|più|può|sarà|farò|farai|scrivi|scrivimi|scrivere|scrittura|fammi|aiutami|dammi|usa|crea|migliora|ottimizza|rendi)\b/i,
  /\b(prompt|sistema|contesto|vincoli|obiettivo|formato|ruolo|task|mail|email|articolo|documento|risposta|domanda)\b/i,
  /\b(una|uno|il|la|gli|le|del|della|dei|delle|nel|nella|sui|sulle|che|con|per|tra|fra)\b/i,
];

const RISK_KEYWORDS = [
  'medical',
  'medicina',
  'legal',
  'legale',
  'lawyer',
  'avvocato',
  'financial advice',
  'consiglio finanziario',
  'investment',
  'investimento',
  'security',
  'sicurezza',
  'production',
  'produzione',
  'patient',
  'paziente',
  'compliance',
  'gdpr',
];

const TASK_TYPE_HINTS: Array<{ type: TaskType; patterns: RegExp[] }> = [
  {
    type: 'coding',
    patterns: [
      /\b(code|function|bug|refactor|class|method|test|api|endpoint|sql|typescript|python|javascript|rust|go|java|c\+\+)\b/i,
      /\b(codice|funzione|metodo|classe|test|errore|debug|refactor)\b/i,
    ],
  },
  {
    type: 'research',
    patterns: [
      /\b(research|literature|paper|survey|find sources|summarize|sintesi|ricerca|paper|fonti)\b/i,
    ],
  },
  {
    type: 'data-extraction',
    patterns: [
      /\b(extract|parse|structured|schema|json|csv|tsv|estrai|estrarre|parsing)\b/i,
    ],
  },
  {
    type: 'writing',
    patterns: [
      /\b(write|draft|email|blog|post|newsletter|copy|script|essay|story|scrivi|scriver(e|a|ò|ai)?|scrittura|articolo|saggio|mail|lettera|comunicato)\b/i,
    ],
  },
  {
    type: 'analysis',
    patterns: [
      /\b(analy[sz]e|review|critique|evaluate|assess|analizza|valuta|recensione|critica)\b/i,
    ],
  },
  {
    type: 'agentic-workflow',
    patterns: [
      /\b(agent|workflow|tool[- ]?use|orchestrat|pipeline|multi[- ]?step|automate|automazione)\b/i,
    ],
  },
  {
    type: 'creative',
    patterns: [/\b(poem|poesia|story|racconto|character|world[- ]?build|design.*creative)\b/i],
  },
  {
    type: 'business',
    patterns: [/\b(business|strategy|market|sales|product launch|strategia|mercato|vendite)\b/i],
  },
  {
    type: 'education',
    patterns: [/\b(teach|tutorial|explain.*beginner|spiega.*principiante|lezione|insegna)\b/i],
  },
];

const ROLE_BY_TASK: Record<TaskType, { it: string; en: string }> = {
  coding: {
    it: 'Senior software engineer con esperienza nel linguaggio/framework richiesto.',
    en: 'Senior software engineer with experience in the requested language/framework.',
  },
  research: {
    it: 'Senior research analyst con metodo rigoroso di citazione e triangolazione delle fonti.',
    en: 'Senior research analyst with rigorous citation and source-triangulation method.',
  },
  writing: {
    it: 'Senior editor con focus su chiarezza, ritmo e adeguatezza al pubblico.',
    en: 'Senior editor focused on clarity, rhythm, and audience fit.',
  },
  analysis: {
    it: 'Senior analyst orientato a evidenze e separazione fatti/inferenze.',
    en: 'Senior analyst focused on evidence and fact/inference separation.',
  },
  'data-extraction': {
    it: 'Specialista di information extraction su schema deterministico.',
    en: 'Information-extraction specialist working against a deterministic schema.',
  },
  'agentic-workflow': {
    it: 'Designer di workflow agentici con padronanza del tool use e della gestione errori.',
    en: 'Agentic-workflow designer with mastery of tool use and error handling.',
  },
  creative: {
    it: 'Autore creativo con voce distintiva e attenzione al dettaglio.',
    en: 'Creative author with distinctive voice and attention to detail.',
  },
  business: {
    it: 'Business strategist con orientamento a trade-off espliciti e metriche.',
    en: 'Business strategist with explicit trade-offs and metrics.',
  },
  education: {
    it: 'Educatore esperto del dominio con capacità di scaffolding didattico.',
    en: 'Domain-expert educator skilled in instructional scaffolding.',
  },
  general: {
    it: 'Assistente generalista esperto, preciso e diretto.',
    en: 'Expert generalist assistant — precise and direct.',
  },
};

const OUTPUT_FORMAT_BY_TASK: Record<TaskType, { it: string; en: string }> = {
  coding: {
    it: 'Codice in code block con linguaggio specificato; prima del codice 2-4 righe di spiegazione delle scelte; dopo il codice eventuali test o note di follow-up.',
    en: 'Code in a fenced block with language tag; precede with 2-4 lines explaining choices; follow with tests or follow-up notes if relevant.',
  },
  research: {
    it: 'Sintesi (3-5 frasi); findings con citazioni inline [n]; open questions; lista fonti numerate (autore, titolo, anno, URL).',
    en: 'Summary (3-5 sentences); findings with inline [n] citations; open questions; numbered source list (author, title, year, URL).',
  },
  writing: {
    it: 'Prosa fluida; paragrafi 60-90 parole; nessun bullet a meno di lista vera; titolo + sottotitolo se appropriato.',
    en: 'Flowing prose; 60-90 word paragraphs; no bullets unless a real list; title + subtitle when appropriate.',
  },
  analysis: {
    it: 'Tesi in una frase; evidenze con riferimento puntuale; controfattuali considerati; raccomandazione finale con confidenza.',
    en: 'Thesis in one sentence; evidences with precise references; counterfactuals considered; final recommendation with confidence level.',
  },
  'data-extraction': {
    it: 'Solo JSON valido conforme allo schema. Nessuna prosa. Campi mancanti = null. evidence_quote testuale, non parafrasi.',
    en: 'Valid JSON only, conforming to the schema. No prose. Missing fields = null. evidence_quote must be verbatim, not paraphrase.',
  },
  'agentic-workflow': {
    it: 'Diagramma testuale degli step; per ogni step: input, tool da chiamare, output atteso, gestione errori, criterio di stop.',
    en: 'Textual diagram of steps; per step: input, tool to invoke, expected output, error handling, stop criterion.',
  },
  creative: {
    it: 'Testo creativo nella lingua e nel registro indicati; lunghezza coerente con la richiesta.',
    en: 'Creative text in the requested language and register; length proportional to the brief.',
  },
  business: {
    it: 'Executive summary; opzioni con trade-off espliciti; raccomandazione; metriche di successo a 30/90/180 giorni.',
    en: 'Executive summary; options with explicit trade-offs; recommendation; 30/90/180-day success metrics.',
  },
  education: {
    it: 'Spiegazione progressiva dal concetto base a quello avanzato; esempi concreti; check di comprensione finale.',
    en: 'Progressive explanation from basic to advanced; concrete examples; final comprehension checks.',
  },
  general: {
    it: 'Risposta strutturata e diretta, lunghezza calibrata alla complessità del task.',
    en: 'Structured, direct answer; length calibrated to task complexity.',
  },
};

export function detectLanguage(text: string, hint?: string): 'it' | 'en' {
  if (hint === 'it' || hint === 'en') return hint;
  if (!text) return 'en';
  let italianHits = 0;
  for (const re of ITALIAN_MARKERS) if (re.test(text)) italianHits += 1;
  return italianHits >= 2 ? 'it' : 'en';
}

export function inferTaskType(text: string, hint?: TaskType): TaskType {
  if (hint) return hint;
  for (const { type, patterns } of TASK_TYPE_HINTS) {
    if (patterns.some((re) => re.test(text))) return type;
  }
  return 'general';
}

function detectExistingSection(text: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

function stripPadding(text: string): { cleaned: string; removed: Array<{ phrase: string; label: string }> } {
  const found = detectPaddingPhrases(text);
  let cleaned = text;
  for (const { phrase } of found) {
    cleaned = cleaned.split(phrase).join('').replace(/[ \t]+/g, ' ');
  }
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  return { cleaned, removed: found };
}

function extractObjective(text: string, lang: 'it' | 'en'): string | null {
  const existing = detectExistingSection(text, 'objective') || detectExistingSection(text, 'goal');
  if (existing) return existing;
  const firstSentence = text.split(/(?<=[.!?])\s+/)[0]?.trim();
  if (firstSentence && firstSentence.length > 8 && firstSentence.length < 280) return firstSentence;
  return lang === 'it'
    ? '[ASSUNZIONE: dedurre l\'obiettivo dal prompt utente]'
    : '[ASSUMPTION: infer the objective from the user prompt]';
}

function detectContradictions(text: string): string[] {
  const out: string[] = [];
  const lower = text.toLowerCase();
  const pairs: Array<[string, string, string]> = [
    ['always', 'never', 'always/never'],
    ['must', 'must not', 'must/must not'],
    ['use markdown', 'no markdown', 'markdown on/off'],
    ['use json', 'no json', 'json on/off'],
    ['be concise', 'be detailed', 'concise/detailed'],
  ];
  for (const [a, b, label] of pairs) {
    if (lower.includes(a) && lower.includes(b)) out.push(label);
  }
  return out;
}

function shouldClarify(opts: PromptImproverOptions, text: string): { needs: boolean; reasons: string[] } {
  const policy = opts.askClarifyingQuestions || 'auto';
  if (policy === 'never') return { needs: false, reasons: [] };
  if (policy === 'always') return { needs: true, reasons: ['Clarification policy = always.'] };

  const reasons: string[] = [];
  if (wordCount(text) < 6) reasons.push('Prompt too short to infer intent reliably.');
  const contradictions = detectContradictions(text);
  if (contradictions.length) reasons.push(`Contradictory instructions: ${contradictions.join(', ')}.`);
  if (hasAny(text, RISK_KEYWORDS)) reasons.push('High-risk domain detected — confirmation needed.');
  return { needs: reasons.length > 0, reasons };
}

function buildClarificationQuestions(
  opts: PromptImproverOptions,
  text: string,
  lang: 'it' | 'en',
): ClarificationQuestion[] {
  const questions: ClarificationQuestion[] = [];

  if (wordCount(text) < 6) {
    questions.push({
      id: 'desired_outcome',
      question:
        lang === 'it'
          ? 'Qual è il risultato concreto che ti aspetti? (1 frase)'
          : 'What is the concrete outcome you expect? (1 sentence)',
    });
  }
  if (!opts.audience) {
    questions.push({
      id: 'audience',
      question: lang === 'it' ? 'Per quale audience? (es. tecnici, clienti finali)' : 'For which audience? (e.g. technical, end-users)',
    });
  }
  if (!detectExistingSection(text, 'output_format') && !/json|markdown|xml|tabella|table/i.test(text)) {
    questions.push({
      id: 'output_format',
      question: lang === 'it' ? 'Formato di output preferito?' : 'Preferred output format?',
      options: ['markdown', 'json', 'plain text', 'table/tabella', 'xml'],
    });
  }
  return questions.slice(0, 3);
}

function inferConstraints(opts: PromptImproverOptions, lang: 'it' | 'en'): string[] {
  const out: string[] = [];
  if (opts.constraints && opts.constraints.length) out.push(...opts.constraints);
  if (opts.tokenBudget === 'minimal') {
    out.push(lang === 'it' ? 'Mantieni la risposta breve; ometti contesto non essenziale.' : 'Keep the answer brief; omit non-essential context.');
  }
  if (opts.preserveStyle) {
    out.push(lang === 'it' ? 'Preserva tono e stile dell\'input originale dove possibile.' : 'Preserve the tone and style of the original input where possible.');
  }
  if (out.length === 0) {
    out.push(
      lang === 'it'
        ? 'Distingui esplicitamente fatti, inferenze e assunzioni.'
        : 'Explicitly distinguish facts, inferences, and assumptions.',
    );
    out.push(
      lang === 'it'
        ? 'Se mancano informazioni critiche, dichiarale invece di inventarle.'
        : 'If critical information is missing, declare it rather than inventing.',
    );
  }
  return out;
}

function buildScaffold(
  cleanedOriginal: string,
  opts: PromptImproverOptions,
  lang: 'it' | 'en',
  taskType: TaskType,
  changes: ImprovementChange[],
): string {
  const role =
    detectExistingSection(cleanedOriginal, 'role') ||
    ROLE_BY_TASK[taskType][lang];
  if (!detectExistingSection(cleanedOriginal, 'role')) {
    changes.push({ type: 'inferred_role', detail: `Role inferred from task type "${taskType}".` });
  }

  const objective = extractObjective(cleanedOriginal, lang) || cleanedOriginal.trim();

  const existingContext = detectExistingSection(cleanedOriginal, 'context');
  let context: string;
  if (existingContext) {
    context = existingContext;
  } else if (opts.audience) {
    context = `Audience: ${opts.audience}.`;
  } else {
    context =
      lang === 'it'
        ? '[ASSUNZIONE: nessun contesto aggiuntivo fornito; il modello deve segnalare ipotesi rilevanti]'
        : '[ASSUMPTION: no additional context provided; the model should flag any load-bearing assumptions]';
  }
  if (!existingContext) {
    changes.push({ type: 'added_section', detail: 'context' });
  }

  const existingTask = detectExistingSection(cleanedOriginal, 'task');
  const taskBody = existingTask || cleanedOriginal.trim() || objective;
  if (!existingTask) {
    changes.push({ type: 'added_section', detail: 'task (wraps original prompt body)' });
  }

  const constraints = inferConstraints(opts, lang);
  const constraintsBlock = constraints.map((c) => `- ${c}`).join('\n');
  if (!detectExistingSection(cleanedOriginal, 'constraints')) {
    changes.push({ type: 'added_section', detail: 'constraints' });
  }

  const outputFormat =
    detectExistingSection(cleanedOriginal, 'output_format') ||
    OUTPUT_FORMAT_BY_TASK[taskType][lang];
  if (!detectExistingSection(cleanedOriginal, 'output_format')) {
    changes.push({ type: 'added_section', detail: 'output_format' });
  }

  const qualityBar =
    lang === 'it'
      ? [
          'Risposta verificabile: ogni claim non banale ha evidenza o fonte.',
          'Conformità a tutti i constraints sopra.',
          'Output conforme allo schema/formato indicato al primo tentativo.',
        ]
      : [
          'Answer is verifiable: every non-trivial claim has evidence or a source.',
          'Conformance to all constraints above.',
          'Output matches the declared schema/format on the first try.',
        ];
  const qualityBlock = qualityBar.map((q) => `- ${q}`).join('\n');

  changes.push({ type: 'wrapped_xml', detail: 'Wrapped prompt in canonical XML scaffold.' });

  return [
    `<role>\n${role}\n</role>`,
    `<objective>\n${objective}\n</objective>`,
    `<context>\n${context}\n</context>`,
    `<task>\n${taskBody}\n</task>`,
    `<constraints>\n${constraintsBlock}\n</constraints>`,
    `<output_format>\n${outputFormat}\n</output_format>`,
    `<quality_bar>\n${qualityBlock}\n</quality_bar>`,
  ].join('\n\n');
}

export function improvePrompt(opts: PromptImproverOptions): ImprovementResult {
  const original = (opts.originalPrompt ?? '').toString();
  const lang = detectLanguage(original, opts.language);
  const taskType = inferTaskType(original, opts.taskType);
  const mode: OutputMode = opts.outputMode || 'standard';

  const changes: ImprovementChange[] = [];
  const assumptions: string[] = [];
  const clarifications: ClarificationQuestion[] = [];

  if (!original.trim()) {
    const empty: ImprovementResult = {
      original,
      improved:
        lang === 'it'
          ? '[Nessun prompt fornito. Fornisci almeno una frase descrittiva.]'
          : '[No prompt provided. Provide at least one descriptive sentence.]',
      mode,
      language: lang,
      taskType,
      scores: {
        before: scorePrompt(''),
        after: scorePrompt(''),
        delta: 0,
        confidence: 'high',
      },
      assumptions: [
        lang === 'it'
          ? 'Input vuoto — nessuna inferenza possibile.'
          : 'Empty input — no inference possible.',
      ],
      changes: [],
      clarifications: [
        {
          id: 'desired_outcome',
          question:
            lang === 'it'
              ? 'Cosa vuoi ottenere? Descrivi il risultato in una frase.'
              : 'What do you want to achieve? Describe the outcome in one sentence.',
        },
      ],
      needsClarification: true,
    };
    return empty;
  }

  const { cleaned, removed } = stripPadding(original);
  if (removed.length) {
    for (const r of removed) {
      changes.push({ type: 'removed_padding', detail: `Removed: ${r.label}` });
    }
  }
  if (cleaned.length !== original.length) {
    changes.push({ type: 'normalized_whitespace', detail: 'Trimmed redundant whitespace and blank lines.' });
  }
  if (cleaned.length === original.length && removed.length === 0) {
    changes.push({ type: 'preserved_user_text', detail: 'No padding/whitespace issues; user text preserved verbatim.' });
  }

  const { needs, reasons } = shouldClarify(opts, cleaned);
  if (needs) {
    clarifications.push(...buildClarificationQuestions(opts, cleaned, lang));
    for (const r of reasons) assumptions.push(`[CLARIFY] ${r}`);
  }

  if (!detectExistingSection(cleaned, 'context') && !opts.audience) {
    assumptions.push(
      lang === 'it'
        ? 'Nessun contesto/audience esplicito — assumiamo audience generica e contesto neutro.'
        : 'No explicit context/audience — assuming generic audience and neutral context.',
    );
  }
  if (!opts.targetModel && !opts.targetAgent) {
    assumptions.push(
      lang === 'it'
        ? 'Nessun modello/agente target dichiarato — usiamo convenzioni cross-vendor (XML scaffolding).'
        : 'No target model/agent declared — using cross-vendor conventions (XML scaffolding).',
    );
  }

  const improved = buildScaffold(cleaned, opts, lang, taskType, changes);

  const before = scorePrompt(original);
  const after = scorePrompt(improved);
  const delta = after.total - before.total;
  const absDelta = Math.abs(delta);
  const confidence: 'low' | 'medium' | 'high' =
    absDelta >= 30 ? 'high' : absDelta >= 10 ? 'medium' : 'low';

  return {
    original,
    improved,
    mode,
    language: lang,
    taskType,
    scores: { before, after, delta, confidence },
    assumptions,
    changes,
    clarifications,
    needsClarification: needs,
  };
}
