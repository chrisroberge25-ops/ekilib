export type VoiceUtterance = {
  text: string;
  dropProposal: boolean;
};

type VoiceListener = (utterance: VoiceUtterance) => void;

let listener: VoiceListener | null = null;

export function bindVoiceListener(next: VoiceListener): () => void {
  listener = next;
  return () => {
    if (listener === next) listener = null;
  };
}

/** Returns true when the chat panel accepted the utterance. */
export function emitVoiceUtterance(utterance: VoiceUtterance): boolean {
  if (!listener) return false;
  listener(utterance);
  return true;
}
