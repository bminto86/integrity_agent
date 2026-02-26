import { useCallback, useEffect, useRef, useState } from "react";

interface UseTTSOptions {
  /** Whether TTS is enabled */
  enabled?: boolean;
  /** Speech rate (0.1 - 10, default 0.95 — slightly slower is more natural) */
  rate?: number;
  /** Speech pitch (0 - 2, default 1.02 — very slight lift sounds warmer) */
  pitch?: number;
  /** Callback when speech starts */
  onStart?: () => void;
  /** Callback when speech ends */
  onEnd?: () => void;
}

/**
 * Score a voice for naturalness. Higher = better.
 * Prioritises Google's neural voices, then Apple's premium voices,
 * then Microsoft's neural voices, then any English female voice.
 */
function scoreVoice(v: SpeechSynthesisVoice): number {
  const n = v.name.toLowerCase();
  const isEnglish = v.lang.startsWith("en");
  if (!isEnglish) return 0;

  let score = 10; // base for any English voice

  // Google neural voices (Chrome) — best quality in browser
  if (n.includes("google")) {
    score += 60;
    if (n.includes("uk english female")) score += 20; // very natural
    if (n.includes("us english")) score += 15;
    if (n.includes("female")) score += 10;
  }

  // Apple voices (Safari) — premium tier
  if (n.includes("samantha")) score += 80; // Apple's best
  if (n.includes("karen")) score += 75;
  if (n.includes("moira")) score += 70;
  if (n.includes("tessa")) score += 70;
  if (n.includes("fiona")) score += 65;
  if (n.includes("victoria")) score += 50;

  // Microsoft neural voices (Edge)
  if (n.includes("microsoft")) {
    score += 40;
    if (n.includes("jenny")) score += 25; // Jenny Neural is excellent
    if (n.includes("aria")) score += 20;
    if (n.includes("sara")) score += 15;
    if (n.includes("zira")) score += 10;
    if (n.includes("online") || n.includes("neural")) score += 15;
  }

  // Prefer female voices for Mia
  if (n.includes("female") || n.includes("woman")) score += 5;
  // Penalise explicitly male voices
  if (n.includes("male") && !n.includes("female")) score -= 20;
  if (n.includes("david") || n.includes("mark") || n.includes("james") || n.includes("daniel")) score -= 15;

  // Prefer local (non-remote) for lower latency, but remote often sounds better
  if (!v.localService) score += 3;

  return score;
}

/**
 * Insert natural pauses into text for more human-like speech.
 * Adds micro-pauses after commas, colons, semicolons, and dashes.
 */
function addNaturalPauses(text: string): string {
  return text
    // Slightly longer pause after periods/question marks/exclamation
    .replace(/([.!?])\s+/g, "$1  ")
    // Brief pause after commas
    .replace(/,\s*/g, ", ")
    // Brief pause after colons and semicolons
    .replace(/[:;]\s*/g, "; ")
    // Pause around em-dashes
    .replace(/\s*—\s*/g, " — ")
    .replace(/\s*--\s*/g, " — ");
}

/** Strip markdown formatting for cleaner speech */
function cleanTextForSpeech(text: string): string {
  let cleaned = text
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

  // Add natural pauses
  cleaned = addNaturalPauses(cleaned);
  return cleaned;
}

export function useTTS(options: UseTTSOptions = {}) {
  const {
    enabled = true,
    rate = 0.95,
    pitch = 1.02,
    onStart,
    onEnd,
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const cancelledRef = useRef(false);

  // Check browser support and load voices
  useEffect(() => {
    const supported = typeof window !== "undefined" && "speechSynthesis" in window;
    setIsSupported(supported);
    if (!supported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;

      setAvailableVoices(voices.filter(v => v.lang.startsWith("en")));

      // Sort by naturalness score and pick the best
      const scored = voices
        .map(v => ({ voice: v, score: scoreVoice(v) }))
        .sort((a, b) => b.score - a.score);

      voiceRef.current = scored[0]?.voice || voices[0];
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /** Speak the given text aloud */
  const speak = useCallback((text: string) => {
    if (!enabled || !isSupported || !text.trim()) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    cancelledRef.current = false;

    const cleanText = cleanTextForSpeech(text);

    // Split into natural sentence chunks for smoother delivery
    // Browser TTS can stall on very long strings
    const sentenceRegex = /[^.!?]+[.!?]+[\s]*/g;
    const rawSentences = cleanText.match(sentenceRegex) || [cleanText];

    // Group sentences into chunks of ~150 chars for natural pacing
    const maxChunkLength = 150;
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of rawSentences) {
      if ((currentChunk + sentence).length > maxChunkLength && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    // Speak chunks sequentially with micro-pauses between them
    let chunkIndex = 0;

    const speakNext = () => {
      if (cancelledRef.current) {
        setIsSpeaking(false);
        onEnd?.();
        return;
      }

      if (chunkIndex >= chunks.length) {
        setIsSpeaking(false);
        onEnd?.();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);

      if (voiceRef.current) {
        utterance.voice = voiceRef.current;
      }

      // Slightly vary rate per chunk for more natural cadence
      const rateVariation = 0.97 + Math.random() * 0.06; // 0.97-1.03
      utterance.rate = rate * rateVariation;
      utterance.pitch = pitch;
      utterance.volume = 1;

      utterance.onstart = () => {
        if (chunkIndex === 0) {
          setIsSpeaking(true);
          onStart?.();
        }
      };

      utterance.onend = () => {
        chunkIndex++;
        // Add a tiny natural pause between chunks (80-200ms)
        const pauseMs = 80 + Math.random() * 120;
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
    currentVoice: voiceRef.current,
  };
}
