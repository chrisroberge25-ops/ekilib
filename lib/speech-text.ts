import { fold } from "./parser";

const CREOLE = [
  "mwen",
  "nou",
  "ou",
  "yo",
  "pou",
  "ak",
  "nan",
  "pa",
  "ki",
  "sa",
  "te",
  "ap",
  "se",
  "yon",
  "kreyol",
  "edtan",
  "travay",
  "domi",
  "sante",
  "lavi",
  "kijan",
  "poukisa",
  "tanpri",
  "mesi",
  "bonjou",
  "bonswa",
  "jodi",
  "konfime",
  "anrejistre",
  "fanmi",
  "espo",
  "fe",
  "pase",
  "ritm",
  "konsey",
  "dako",
  "wi",
  "bezwen",
  "pral",
  "kote",
  "men",
  "epi",
  "tou",
  "pi",
  "plis",
  "kounye",
  "demen",
  "swen",
  "repo",
  "jounal",
  "mete",
  "vle",
  "tande",
  "pale",
  "gade",
  "kenbe",
  "pwoteje",
  "balans",
];

const ENGLISH = [
  "the",
  "and",
  "you",
  "your",
  "to",
  "of",
  "for",
  "with",
  "this",
  "that",
  "balance",
  "hours",
  "sleep",
  "please",
  "today",
  "should",
  "can",
  "dont",
  "understood",
  "confirm",
  "journal",
  "work",
  "what",
  "have",
  "from",
  "help",
  "advice",
];

const FRENCH = [
  "je",
  "vous",
  "pour",
  "les",
  "des",
  "une",
  "heures",
  "sommeil",
  "equilibre",
  "aujourdhui",
  "suis",
  "peux",
  "travailler",
  "compris",
  "ajoute",
  "travaille",
];

const CARDINALS = [
  "zero",
  "yon",
  "de",
  "twa",
  "kat",
  "senk",
  "sis",
  "sèt",
  "uit",
  "nèf",
  "dis",
  "onz",
  "douz",
  "trèz",
  "katòz",
  "kenz",
  "sèz",
  "disèt",
  "dizwit",
  "diznèf",
  "ven",
  "venteyen",
  "vennde",
  "venntwa",
  "vennkat",
];

function normalized(text: string): string {
  return fold(text).replace(/'/g, "");
}

function hits(folded: string, words: string[]): number {
  let count = 0;
  for (const word of words) {
    const pattern = new RegExp(`(?:^|[^a-z])${word}(?:[^a-z]|$)`, "g");
    const found = folded.match(pattern);
    if (found) count += found.length;
  }
  return count;
}

export function kreyolMarkerCount(text: string): number {
  return hits(normalized(text), CREOLE);
}

/** True when the reply is safe to speak as Haitian Creole. Short unmarked lines pass. */
export function isKreyolText(text: string): boolean {
  const folded = normalized(text);
  const creole = hits(folded, CREOLE);
  const foreign = hits(folded, ENGLISH) + hits(folded, FRENCH);
  if (creole === 0 && foreign === 0) return true;
  if (creole === 0 && foreign >= 2) return false;
  if (foreign >= 3 && foreign > creole) return false;
  return creole > 0;
}

/** Spell small numbers so ElevenLabs does not read them in English. */
export function spellKreyolNumbers(text: string): string {
  return text.replace(/\b(\d{1,2})(?:[.,](5|50))?\b/g, (full, whole: string, frac?: string) => {
    const value = Number(whole);
    if (!Number.isInteger(value) || value < 0 || value >= CARDINALS.length) return full;
    const word = CARDINALS[value];
    return frac ? `${word} ak demi` : word;
  });
}

export function speakableText(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[*_#>`]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 800);
}
