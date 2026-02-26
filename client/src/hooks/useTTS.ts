import { useCallback, useEffect, useRef, useState } from "react";

interface UseTTSOptions {
  /** Whether TTS is enabled */
  enabled?: boolean;
  /** Speech rate (0.1 - 10, default 0.92 — slightly slower is more natural) */
  rate?: number;
  /** Speech pitch (0 - 2, default 1.0) */
  pitch?: number;
  /** Preferred voice name (stored in settings) */
  preferredVoiceName?: string;
  /** Callback when speech starts */
  onStart?: () => void;
  /** Callback when speech ends */
  onEnd?: () => void;
}

// ─── Voice ranking system ───────────────────────────────────────────
// Each voice gets a score. The highest-scoring English voice is selected.
// This ranking is based on extensive testing across Chrome, Edge, Safari, Firefox.

const VOICE_TIERS: Array<{ pattern: RegExp; score: number }> = [
  // Tier 1: Google neural voices (Chrome desktop) — best free browser TTS
  { pattern: /google\s+uk\s+english\s+female/i, score: 200 },
  { pattern: /google\s+us\s+english/i, score: 190 },
  { pattern: /google\s+.*english.*female/i, score: 185 },
  { pattern: /google\s+.*english/i, score: 180 },

  // Tier 2: Apple premium voices (Safari/macOS) — very natural
  { pattern: /samantha\s*\(enhanced\)/i, score: 195 },
  { pattern: /samantha/i, score: 175 },
  { pattern: /karen\s*\(enhanced\)/i, score: 172 },
  { pattern: /karen/i, score: 168 },
  { pattern: /moira\s*\(enhanced\)/i, score: 165 },
  { pattern: /moira/i, score: 160 },
  { pattern: /tessa\s*\(enhanced\)/i, score: 158 },
  { pattern: /tessa/i, score: 155 },
  { pattern: /fiona\s*\(enhanced\)/i, score: 152 },
  { pattern: /fiona/i, score: 148 },

  // Tier 3: Microsoft neural voices (Edge/Windows) — good quality
  { pattern: /microsoft\s+jenny\s+online/i, score: 170 },
  { pattern: /microsoft\s+jenny/i, score: 165 },
  { pattern: /microsoft\s+aria\s+online/i, score: 162 },
  { pattern: /microsoft\s+aria/i, score: 158 },
  { pattern: /microsoft\s+sara\s+online/i, score: 155 },
  { pattern: /microsoft\s+sara/i, score: 150 },
  { pattern: /microsoft\s+.*online.*natural/i, score: 148 },
  { pattern: /microsoft\s+.*online/i, score: 140 },
  { pattern: /microsoft\s+zira/i, score: 130 },
  { pattern: /microsoft\s+.*female/i, score: 125 },

  // Tier 4: Any "enhanced" or "premium" or "natural" voice
  { pattern: /\(enhanced\)/i, score: 120 },
  { pattern: /\(premium\)/i, score: 118 },
  { pattern: /natural/i, score: 115 },
  { pattern: /neural/i, score: 112 },

  // Tier 5: Named female voices (various platforms)
  { pattern: /\bava\b/i, score: 100 },
  { pattern: /\bellen\b/i, score: 98 },
  { pattern: /\bsophie\b/i, score: 96 },
  { pattern: /\bemma\b/i, score: 94 },
  { pattern: /\bolive\b/i, score: 92 },
];

function scoreVoice(v: SpeechSynthesisVoice): number {
  const isEnglish = v.lang.startsWith("en");
  if (!isEnglish) return -1;

  // Check against ranked tiers
  for (const tier of VOICE_TIERS) {
    if (tier.pattern.test(v.name)) {
      return tier.score;
    }
  }

  // Fallback scoring for unrecognized English voices
  let score = 10;
  const n = v.name.toLowerCase();

  // Prefer female-sounding voices for Mia
  if (n.includes("female") || n.includes("woman")) score += 5;
  // Penalise explicitly male voices
  if (n.includes("male") && !n.includes("female")) score -= 30;
  if (/\b(david|mark|james|daniel|guy|richard|tom|george)\b/i.test(n)) score -= 25;

  // Remote voices are often higher quality
  if (!v.localService) score += 8;

  return score;
}

// ─── Natural speech processing ──────────────────────────────────────

/** Strip markdown and clean text for natural speech */
function cleanTextForSpeech(text: string): string {
  return text
    // Remove markdown bold/italic
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // Remove markdown headers
    .replace(/^#{1,6}\s+/gm, "")
    // Remove markdown links, keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove markdown code blocks
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    // Remove bullet points
    .replace(/^[-*+]\s+/gm, "")
    // Remove numbered lists prefix
    .replace(/^\d+\.\s+/gm, "")
    // Collapse multiple newlines into sentence breaks
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    // Clean up extra spaces
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Split text into natural sentence-sized chunks.
 * Each chunk is spoken as a separate utterance with a pause between.
 * This prevents the browser from stalling on long text and creates
 * a more natural cadence.
 */
function splitIntoSpeechChunks(text: string): string[] {
  // Split on sentence boundaries
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g);
  if (!sentences) return [text];

  const maxChunkLength = 120; // shorter chunks = more natural pauses
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if ((current + " " + trimmed).length > maxChunkLength && current) {
      chunks.push(current.trim());
      current = trimmed;
    } else {
      current = current ? current + " " + trimmed : trimmed;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

// ─── Preferred voice persistence ────────────────────────────────────

const VOICE_STORAGE_KEY = "mia-preferred-voice";

function getStoredVoiceName(): string | null {
  try {
    return localStorage.getItem(VOICE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeVoiceName(name: string): void {
  try {
    localStorage.setItem(VOICE_STORAGE_KEY, name);
  } catch {
    // silent fail
  }
}

// ─── Hook ───────────────────────────────────────────────────────────

export function useTTS(options: UseTTSOptions = {}) {
  const {
    enabled = true,
    rate = 0.92,
    pitch = 1.0,
    preferredVoiceName,
    onStart,
    onEnd,
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>("");
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const cancelledRef = useRef(false);
  const chunksRef = useRef<string[]>([]);
  const chunkIndexRef = useRef(0);

  // Load voices and select the best one
  useEffect(() => {
    const supported = typeof window !== "undefined" && "speechSynthesis" in window;
    setIsSupported(supported);
    if (!supported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;

      const englishVoices = voices.filter(v => v.lang.startsWith("en"));
      setAvailableVoices(englishVoices);

      // Check for user's preferred voice first
      const storedName = preferredVoiceName || getStoredVoiceName();
      if (storedName) {
        const preferred = voices.find(v => v.name === storedName);
        if (preferred) {
          voiceRef.current = preferred;
          setSelectedVoiceName(preferred.name);
          return;
        }
      }

      // Auto-select the highest-scoring voice
      const scored = voices
        .map(v => ({ voice: v, score: scoreVoice(v) }))
        .filter(v => v.score > 0)
        .sort((a, b) => b.score - a.score);

      const best = scored[0]?.voice || englishVoices[0] || voices[0];
      voiceRef.current = best;
      setSelectedVoiceName(best?.name || "");
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [preferredVoiceName]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /** Select a specific voice by name */
  const selectVoice = useCallback((voiceName: string) => {
    const voice = availableVoices.find(v => v.name === voiceName);
    if (voice) {
      voiceRef.current = voice;
      setSelectedVoiceName(voice.name);
      storeVoiceName(voice.name);
    }
  }, [availableVoices]);

  /** Preview a voice with a sample sentence */
  const previewVoice = useCallback((voiceName: string) => {
    if (!isSupported) return;

    window.speechSynthesis.cancel();

    const voice = availableVoices.find(v => v.name === voiceName);
    if (!voice) return;

    const utterance = new SpeechSynthesisUtterance(
      "Hi, I'm Mia, your integrity operations assistant. How can I help you today?"
    );
    utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1;

    window.speechSynthesis.speak(utterance);
  }, [isSupported, availableVoices, rate, pitch]);

  /** Speak the given text aloud with natural cadence */
  const speak = useCallback((text: string) => {
    if (!enabled || !isSupported || !text.trim()) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    cancelledRef.current = false;

    const cleanText = cleanTextForSpeech(text);
    const chunks = splitIntoSpeechChunks(cleanText);
    chunksRef.current = chunks;
    chunkIndexRef.current = 0;

    const speakNext = () => {
      if (cancelledRef.current) {
        setIsSpeaking(false);
        onEnd?.();
        return;
      }

      const idx = chunkIndexRef.current;
      if (idx >= chunksRef.current.length) {
        setIsSpeaking(false);
        onEnd?.();
        return;
      }

      const chunkText = chunksRef.current[idx];
      const utterance = new SpeechSynthesisUtterance(chunkText);

      if (voiceRef.current) {
        utterance.voice = voiceRef.current;
      }

      // Natural cadence: slightly vary rate per chunk
      // First chunk slightly slower (warm start), middle normal, last slightly slower (winding down)
      const isFirst = idx === 0;
      const isLast = idx === chunksRef.current.length - 1;
      let chunkRate = rate;
      if (isFirst) chunkRate = rate * 0.95;
      else if (isLast) chunkRate = rate * 0.93;
      else chunkRate = rate * (0.97 + Math.random() * 0.06);

      utterance.rate = chunkRate;
      utterance.pitch = pitch;
      utterance.volume = 1;

      utterance.onstart = () => {
        if (idx === 0) {
          setIsSpeaking(true);
          onStart?.();
        }
      };

      utterance.onend = () => {
        chunkIndexRef.current++;

        // Natural pause between chunks: longer after questions, shorter between related sentences
        const endsWithQuestion = chunkText.trim().endsWith("?");
        const baseMs = endsWithQuestion ? 250 : 120;
        const jitter = Math.random() * 100;
        const pauseMs = baseMs + jitter;

        setTimeout(speakNext, pauseMs);
      };

      utterance.onerror = (e) => {
        if (e.error !== "interrupted" && e.error !== "canceled") {
          console.warn("[TTS] Speech error:", e.error);
        }
        setIsSpeaking(false);
        onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  }, [enabled, isSupported, rate, pitch, onStart, onEnd]);

  /** Stop speaking immediately */
  const stop = useCallback(() => {
    cancelledRef.current = true;
    chunksRef.current = [];
    chunkIndexRef.current = 0;
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isSupported,
    availableVoices,
    selectedVoiceName,
    selectVoice,
    previewVoice,
  };
}
