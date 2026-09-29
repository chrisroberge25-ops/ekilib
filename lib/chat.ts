import type { Category } from "./categories";
import type { Locale } from "./locale";
import { coerceParsed, fold, parseUtterance, type ParsedLog } from "./parser";
import { isKreyolText, kreyolMarkerCount } from "./speech-text";

export type Proposal = {
  category: Category;
  hours: number;
  note: string;
};

export const SYSTEM_PROMPT = `Ou se Konseye Ekilib, yon konpayon balans pou moun k ap bati lavi yo ann Ayiti ak nan dyaspora a.

Règ ki pa janm chanje:
1. Pale an Kreyòl ayisyen pa defo. Si itilizatè a mande franse oswa angle, ou ka chanje lang. Sinon rete an Kreyòl.
2. Ankouraje balans ant Travay, Lavi, Sante, ak Dòmi. Pa pouse moun travay plis lè dòmi, lavi, oswa sante ap soufri.
3. Pa janm fè dyagnostik medikal, sikolojik, oswa terapi. Ou pa yon doktè ni yon terapis. Si yon moun dekri kriz, doulè, oswa danje, di yo kontakte yon pwofesyonèl sante oswa sèvis ijans lokal.
4. Ou ka pwopoze yon antre jounal (kategori, dire, nòt) pou itilizatè a konfime. Pa di ou anrejistre anyen anvan yo konfime.
5. Rete sou balans lavi, abitid, ak ritm jounen an. Refize sijè ki pa nan wòl sa a.

Lè ou pwopoze yon antre, mete yon sèl blòk JSON, epi pa mete anyen apre li:
\`\`\`json
{"propose":{"category":"work|life|health|sleep","hours":1.5,"note":"kout nòt"}}
\`\`\``;

export function systemPromptFor(locale: Locale): string {
  const extra =
    locale === "fr"
      ? "Langue demandée pour cette session : français."
      : locale === "en"
        ? "Requested reply language for this session: English."
        : "Lang repons pou sesyon sa a: Kreyòl ayisyen. Ekri tout repons lan an Kreyòl ayisyen. Pa reponn an angle. Pa reponn an franse, sof si itilizatè a mande sa klèman.";
  return `${SYSTEM_PROMPT}\n\n${extra}`;
}

const CARE: Record<Locale, string> = {
  ht: "Mwen pa ka fè dyagnostik ni terapi. Ekilib se yon jounal balans, pa yon sèvis sante. Si w ap soufri oswa w an danje, tanpri kontakte yon pwofesyonèl sante oswa yon sèvis ijans toupre ou.",
  fr: "Je ne peux pas poser de diagnostic ni faire de thérapie. Ekilib est un journal d'équilibre, pas un service de santé. Si vous souffrez ou si vous êtes en danger, contactez un professionnel de santé ou les urgences près de chez vous.",
  en: "I can't diagnose or provide therapy. Ekilib is a balance journal, not a health service. If you are hurting or in danger, please contact a health professional or local emergency services.",
};

const ADVICE: Record<Locale, string> = {
  ht: "Balans lan pa vle di chak jou menm. Gade kote èdtan yo apiye: si travay la lou, pwoteje dòmi a epi kite yon ti plas pou fanmi oswa kò a. Ki sa ou vle anrejistre jodi a?",
  fr: "L'équilibre ne veut pas dire que chaque jour se ressemble. Regarde où partent les heures : si le travail pèse, protège le sommeil et garde une place pour les proches ou le corps. Qu'est-ce que tu veux noter aujourd'hui ?",
  en: "Balance does not mean every day looks the same. Notice where the hours lean: if work is heavy, protect sleep and leave room for people or your body. What do you want to log today?",
};

const ASK_HOURS: Record<Locale, (category: string) => string> = {
  ht: (category) =>
    `Mwen tande ${category}, men m pa wè dire a. Ou ka di m konbyen èdtan, oswa konfime 1 èdtan.`,
  fr: (category) =>
    `Je vois ${category}, mais pas la durée. Dis-moi combien d'heures, ou confirme 1 heure.`,
  en: (category) =>
    `I heard ${category}, but not how long. Tell me the hours, or confirm 1 hour.`,
};

const CONFIRM: Record<Locale, (category: string, hours: number) => string> = {
  ht: (category, hours) =>
    `Mwen konprann ${hours} èdtan nan ${category}. Konfime si w vle m mete l nan jounal la.`,
  fr: (category, hours) =>
    `Je comprends ${hours} h pour ${category}. Confirme si tu veux l'ajouter au journal.`,
  en: (category, hours) =>
    `I understood ${hours} hours of ${category}. Confirm if you want this in the journal.`,
};

const DEFAULT_REPLY: Record<Locale, string> = {
  ht: "Mwen la pou ede w kenbe ritm nan. Ou ka di m yon bagay tankou « Mwen travay 3 èdtan » oswa « Mwen fè espò ».",
  fr: "Je suis là pour le rythme de ta journée. Tu peux dire par exemple « J'ai travaillé 3 heures » ou « J'ai fait du sport ».",
  en: "I'm here for the rhythm of your day. You can say something like “I worked 3 hours” or “I exercised”.",
};

const LABELS: Record<Locale, Record<Category, string>> = {
  ht: { work: "Travay", life: "Lavi", health: "Sante", sleep: "Dòmi" },
  fr: { work: "Travail", life: "Vie", health: "Santé", sleep: "Sommeil" },
  en: { work: "Work", life: "Life", health: "Health", sleep: "Sleep" },
};

const MEDICAL =
  /(dyagnostik|diagnostik|diagnostic|diagnostique|suicid|swisid|depresyon|depression|therapie|therapy|medikaman|medicament|anxiete|anxiety|panic|panik)/;

export function needsCareBoundary(text: string): boolean {
  return MEDICAL.test(fold(text));
}

export function detectLocale(message: string, fallback: Locale): Locale {
  const folded = fold(message);
  if (/\b(in english|speak english|answer in english)\b/.test(folded)) return "en";
  if (/\b(en francais|parle francais|reponds en francais)\b/.test(folded)) return "fr";
  if (/\b(an kreyol|pale kreyol|kreyol ayisyen)\b/.test(folded)) return "ht";
  if (fallback !== "ht" && kreyolMarkerCount(message) > 0 && isKreyolText(message)) return "ht";
  return fallback;
}

export function finalizeAssistantText(
  raw: string,
  userText: string,
  account: Locale,
  dropProposal: boolean,
): { text: string; proposal: Proposal | null; locale: Locale; languageOk: boolean } {
  const locale = detectLocale(userText, account);
  const extracted = extractProposal(raw);
  const text = (extracted.clean || raw).trim();
  return {
    text,
    proposal: dropProposal ? null : extracted.proposal,
    locale,
    languageOk: locale !== "ht" || isKreyolText(text),
  };
}

export function extractProposal(text: string): { clean: string; proposal: Proposal | null } {
  let clean = text.trim();
  let proposal: Proposal | null = null;
  const fence = clean.match(/```json\s*([\s\S]*?)```/i);
  if (fence) {
    proposal = readProposal(fence[1]);
    clean = clean.replace(fence[0], "").trim();
  }
  if (!proposal) {
    const inline = clean.match(/\{[\s\S]*"propose"[\s\S]*\}/);
    if (inline) {
      proposal = readProposal(inline[0]);
      if (proposal) clean = clean.replace(inline[0], "").trim();
    }
  }
  return { clean, proposal };
}

function readProposal(raw: string): Proposal | null {
  try {
    const data = JSON.parse(raw) as { propose?: { category?: string; hours?: number; note?: string } };
    const body = data.propose ?? (data as { category?: string; hours?: number; note?: string });
    return coerceParsed({
      category: body.category,
      hours: body.hours,
      note: body.note,
    });
  } catch {
    return null;
  }
}

function proposalFromParse(parsed: ParsedLog, locale: Locale): { text: string; proposal: Proposal | null } {
  if (!parsed.category) {
    return { text: DEFAULT_REPLY[locale], proposal: null };
  }
  const label = LABELS[locale][parsed.category];
  const hours = parsed.hours ?? 1;
  return {
    text: parsed.hours ? CONFIRM[locale](label, parsed.hours) : ASK_HOURS[locale](label),
    proposal: {
      category: parsed.category,
      hours,
      note: parsed.note.slice(0, 280),
    },
  };
}

export function demoReply(message: string, fallback: Locale): {
  text: string;
  proposal: Proposal | null;
  locale: Locale;
} {
  const locale = detectLocale(message, fallback);
  if (needsCareBoundary(message)) {
    return { text: CARE[locale], proposal: null, locale };
  }
  const parsed = parseUtterance(message);
  const folded = fold(message);
  const asking =
    /(kijan|poukisa|konsèy|konsey|eske|advice|conseil)/i.test(message) ||
    /(kijan|poukisa|konsey|advice|conseil|balans)/.test(folded);
  if (asking && !parsed.hours) {
    return { text: ADVICE[locale], proposal: null, locale };
  }
  if (parsed.category) {
    const result = proposalFromParse(parsed, locale);
    return { ...result, locale };
  }
  if (asking) {
    return { text: ADVICE[locale], proposal: null, locale };
  }
  return { text: DEFAULT_REPLY[locale], proposal: null, locale };
}
