import { useCallback, useEffect, useRef, useState } from "react";

interface UseTTSOptions {
  /** Whether TTS is enabled */
  enabled?: boolean;
  /** Preferred voice name pattern (e.g., "female", "Samantha") */
  voicePreference?: string;
  /** Speech rate (0.1 - 10, default 1) */
  rate?: number;
  /** Speech pitch (0 - 2, default 1) */
  pitch?: number;
  /** Callback when speech starts */
  onStart?: () => void;
  /** Callback when speech ends */
  onEnd?: () => void;
}

export function useTTS(options: UseTTSOptions = {}) {
  const {
    enabled = true,
    voicePreference = "female",
    rate = 1,
    pitch = 1,
    onStart,
    onEnd,
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Check browser support and load voices
  useEffect(() => {
    const supported = typeof window !== "undefined" && "speechSynthesis" in window;
    setIsSupported(supported);
    if (!supported) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;

      // Try to find a natural-sounding female voice
      const preferencePatterns = [
        // High quality voices
        /samantha/i, /karen/i, /moira/i, /tessa/i, /fiona/i,
        // Google voices
        /google.*female/i, /google.*us.*english/i,
        // Microsoft voices
        /microsoft.*zira/i, /microsoft.*jenny/i, /microsoft.*aria/i,
        // Generic female
        /female/i, /woman/i,
      ];

      let selectedVoice: SpeechSynthesisVoice | null = null;

      // First try preference patterns
      for (const pattern of preferencePatterns) {
        const match = voices.find(v => pattern.test(v.name) && v.lang.startsWith("en"));
        if (match) {
          selectedVoice = match;
          break;
        }
      }

      // Fallback: any English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.startsWith("en") && !v.name.toLowerCase().includes("male")) 
          || voices.find(v => v.lang.startsWith("en"))
          || voices[0];
      }

      voiceRef.current = selectedVoice;
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [voicePreference]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /** Strip markdown formatting for cleaner speech */
  const cleanTextForSpeech = useCallback((text: string): string => {
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
      // Collapse multiple newlines
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      // Clean up extra spaces
      .replace(/\s{2,}/g, " ")
      .trim();
  }, []);

  /** Speak the given text aloud */
  const speak = useCallback((text: string) => {
    if (!enabled || !isSupported || !text.trim()) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const cleanText = cleanTextForSpeech(text);
    
    // Split long text into chunks (browser TTS has limits ~200-300 chars)
    const maxChunkLength = 200;
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
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

    // Speak chunks sequentially
    let chunkIndex = 0;

    const speakNext = () => {
      if (chunkIndex >= chunks.length) {
        setIsSpeaking(false);
        onEnd?.();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
      utteranceRef.current = utterance;

      if (voiceRef.current) {
        utterance.voice = voiceRef.current;
      }
      utterance.rate = rate;
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
        speakNext();
      };

      utterance.onerror = (e) => {
        // Ignore 'interrupted' errors from cancel()
        if (e.error !== "interrupted") {
          console.warn("[TTS] Speech error:", e.error);
        }
        setIsSpeaking(false);
        onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    };

    speakNext();
  }, [enabled, isSupported, rate, pitch, onStart, onEnd, cleanTextForSpeech]);

  /** Stop speaking immediately */
  const stop = useCallback(() => {
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
  };
}
