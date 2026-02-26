import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from "react";

// ─── Types ───────────────────────────────────────────────────────────
export type MiaMood = "neutral" | "happy" | "thinking" | "concerned" | "speaking";
export type MiaSize = "sm" | "md" | "lg" | "xl";

interface MiaDigitalHumanProps {
  mood?: MiaMood;
  size?: MiaSize;
  className?: string;
  speaking?: boolean;
  onSpeechEnd?: () => void;
}

export interface MiaDigitalHumanRef {
  speak: (text: string) => void;
  stopSpeaking: () => void;
  setMood: (mood: MiaMood) => void;
}

// ─── Constants ───────────────────────────────────────────────────────
const SIZE_MAP: Record<MiaSize, number> = { sm: 64, md: 120, lg: 200, xl: 300 };

// Skin & feature colors
const SKIN = "#F5D0B0";
const SKIN_SHADOW = "#E8B896";
const HAIR = "#3B2314";
const HAIR_HIGHLIGHT = "#5A3A22";
const LIP = "#D4726A";
const LIP_DARK = "#B85A52";
const EYE_WHITE = "#FAFAFA";
const IRIS = "#4A7C6F";
const IRIS_INNER = "#3A6A5E";
const PUPIL = "#1A1A1A";
const EYEBROW = "#4A3020";
const LASH = "#2A1A10";
const BLUSH = "rgba(220, 120, 120, 0.15)";
const NOSE_SHADOW = "#E0A888";

// Viseme mouth shapes: [width_factor, height_factor, roundness]
const VISEMES: Record<string, [number, number, number]> = {
  rest: [1.0, 0.08, 0.3],
  A: [1.1, 0.55, 0.7],
  E: [1.2, 0.35, 0.4],
  I: [1.15, 0.25, 0.3],
  O: [0.7, 0.55, 0.9],
  U: [0.6, 0.45, 0.95],
  M: [1.0, 0.05, 0.2],
  F: [1.05, 0.15, 0.3],
  TH: [1.1, 0.2, 0.4],
  L: [1.0, 0.3, 0.5],
  W: [0.65, 0.4, 0.85],
  S: [1.15, 0.15, 0.3],
};

// Simple phoneme-to-viseme mapping
function charToViseme(ch: string): string {
  const c = ch.toLowerCase();
  if ("aà".includes(c)) return "A";
  if ("eéè".includes(c)) return "E";
  if ("iíì".includes(c)) return "I";
  if ("oóò".includes(c)) return "O";
  if ("uúù".includes(c)) return "U";
  if ("mbp".includes(c)) return "M";
  if ("fv".includes(c)) return "F";
  if ("td".includes(c)) return "TH";
  if ("lnr".includes(c)) return "L";
  if ("w".includes(c)) return "W";
  if ("szc".includes(c)) return "S";
  return "rest";
}

// ─── Animation State ─────────────────────────────────────────────────
interface AnimState {
  // Blink
  blinkProgress: number; // 0 = open, 1 = closed
  blinkTimer: number;
  isBlinking: boolean;
  // Eye look
  eyeX: number;
  eyeY: number;
  eyeTargetX: number;
  eyeTargetY: number;
  eyeLookTimer: number;
  // Head
  headTiltX: number;
  headTiltY: number;
  headTargetX: number;
  headTargetY: number;
  headTimer: number;
  // Breathing
  breathPhase: number;
  // Mouth (lip sync)
  mouthWidth: number;
  mouthHeight: number;
  mouthRound: number;
  mouthTargetWidth: number;
  mouthTargetHeight: number;
  mouthTargetRound: number;
  // Mood
  currentMood: MiaMood;
  moodTransition: number; // 0-1 blend
  targetMood: MiaMood;
  // Eyebrow
  browLift: number;
  browTarget: number;
  // Smile
  smile: number;
  smileTarget: number;
  // Speaking glow
  speakingGlow: number;
}

function createInitialState(): AnimState {
  return {
    blinkProgress: 0, blinkTimer: 2 + Math.random() * 3, isBlinking: false,
    eyeX: 0, eyeY: 0, eyeTargetX: 0, eyeTargetY: 0, eyeLookTimer: 1 + Math.random() * 2,
    headTiltX: 0, headTiltY: 0, headTargetX: 0, headTargetY: 0, headTimer: 3 + Math.random() * 4,
    breathPhase: 0,
    mouthWidth: 1.0, mouthHeight: 0.08, mouthRound: 0.3,
    mouthTargetWidth: 1.0, mouthTargetHeight: 0.08, mouthTargetRound: 0.3,
    currentMood: "neutral", moodTransition: 1, targetMood: "neutral",
    browLift: 0, browTarget: 0,
    smile: 0, smileTarget: 0,
    speakingGlow: 0,
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(1, t);
}

// ─── Update Logic ────────────────────────────────────────────────────
function updateState(s: AnimState, dt: number, isSpeaking: boolean): void {
  // Blink
  s.blinkTimer -= dt;
  if (s.blinkTimer <= 0 && !s.isBlinking) {
    s.isBlinking = true;
    s.blinkProgress = 0;
  }
  if (s.isBlinking) {
    s.blinkProgress += dt * 8;
    if (s.blinkProgress >= 2) {
      s.isBlinking = false;
      s.blinkProgress = 0;
      s.blinkTimer = 2 + Math.random() * 4;
    }
  }

  // Eye drift
  s.eyeLookTimer -= dt;
  if (s.eyeLookTimer <= 0) {
    s.eyeTargetX = (Math.random() - 0.5) * 0.3;
    s.eyeTargetY = (Math.random() - 0.5) * 0.15;
    s.eyeLookTimer = 1.5 + Math.random() * 3;
  }
  s.eyeX = lerp(s.eyeX, s.eyeTargetX, dt * 3);
  s.eyeY = lerp(s.eyeY, s.eyeTargetY, dt * 3);

  // Head sway
  s.headTimer -= dt;
  if (s.headTimer <= 0) {
    s.headTargetX = (Math.random() - 0.5) * 4;
    s.headTargetY = (Math.random() - 0.5) * 2;
    s.headTimer = 3 + Math.random() * 5;
  }
  s.headTiltX = lerp(s.headTiltX, s.headTargetX, dt * 0.8);
  s.headTiltY = lerp(s.headTiltY, s.headTargetY, dt * 0.8);

  // Breathing
  s.breathPhase += dt * 0.8;

  // Mouth interpolation
  const mouthSpeed = isSpeaking ? 12 : 4;
  s.mouthWidth = lerp(s.mouthWidth, s.mouthTargetWidth, dt * mouthSpeed);
  s.mouthHeight = lerp(s.mouthHeight, s.mouthTargetHeight, dt * mouthSpeed);
  s.mouthRound = lerp(s.mouthRound, s.mouthTargetRound, dt * mouthSpeed);

  // Mood transitions
  if (s.targetMood !== s.currentMood) {
    s.moodTransition += dt * 2;
    if (s.moodTransition >= 1) {
      s.currentMood = s.targetMood;
      s.moodTransition = 1;
    }
  }

  // Mood-driven targets
  switch (s.targetMood) {
    case "happy": s.browTarget = 0.15; s.smileTarget = 0.8; break;
    case "thinking": s.browTarget = 0.4; s.smileTarget = 0.1; break;
    case "concerned": s.browTarget = -0.3; s.smileTarget = -0.2; break;
    case "speaking": s.browTarget = 0.1; s.smileTarget = 0.3; break;
    default: s.browTarget = 0; s.smileTarget = 0.15; break;
  }
  s.browLift = lerp(s.browLift, s.browTarget, dt * 3);
  s.smile = lerp(s.smile, s.smileTarget, dt * 3);

  // Speaking glow
  s.speakingGlow = lerp(s.speakingGlow, isSpeaking ? 1 : 0, dt * 4);
}

// ─── Drawing ─────────────────────────────────────────────────────────
function drawMia(ctx: CanvasRenderingContext2D, w: number, h: number, s: AnimState, isSpeaking: boolean): void {
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, w * dpr, h * dpr);
  ctx.save();
  ctx.scale(dpr, dpr);

  const cx = w / 2;
  const cy = h / 2;
  const scale = Math.min(w, h) / 300;

  // Breathing offset
  const breathY = Math.sin(s.breathPhase) * 1.5 * scale;

  ctx.save();
  ctx.translate(cx + s.headTiltX * scale, cy + s.headTiltY * scale + breathY);

  // ── Speaking glow ──
  if (s.speakingGlow > 0.01) {
    const glowGrad = ctx.createRadialGradient(0, 0, 60 * scale, 0, 0, 130 * scale);
    glowGrad.addColorStop(0, `rgba(74, 124, 111, ${0.12 * s.speakingGlow})`);
    glowGrad.addColorStop(1, "rgba(74, 124, 111, 0)");
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 130 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // ── Neck ──
  ctx.fillStyle = SKIN_SHADOW;
  ctx.beginPath();
  ctx.moveTo(-18 * scale, 55 * scale);
  ctx.quadraticCurveTo(-15 * scale, 85 * scale, -25 * scale, 110 * scale);
  ctx.lineTo(25 * scale, 110 * scale);
  ctx.quadraticCurveTo(15 * scale, 85 * scale, 18 * scale, 55 * scale);
  ctx.closePath();
  ctx.fill();

  // ── Shoulders hint ──
  ctx.fillStyle = SKIN_SHADOW;
  ctx.beginPath();
  ctx.ellipse(0, 105 * scale, 65 * scale, 18 * scale, 0, 0, Math.PI);
  ctx.fill();

  // ── Face shape ──
  const faceW = 72 * scale;
  const faceH = 90 * scale;
  const faceGrad = ctx.createRadialGradient(-10 * scale, -15 * scale, 10 * scale, 0, 0, faceH);
  faceGrad.addColorStop(0, "#FAE0CC");
  faceGrad.addColorStop(0.7, SKIN);
  faceGrad.addColorStop(1, SKIN_SHADOW);
  ctx.fillStyle = faceGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, faceW, faceH, 0, 0, Math.PI * 2);
  ctx.fill();

  // Jaw / chin refinement
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.moveTo(-faceW * 0.7, faceH * 0.3);
  ctx.quadraticCurveTo(-faceW * 0.4, faceH * 1.05, 0, faceH * 0.95);
  ctx.quadraticCurveTo(faceW * 0.4, faceH * 1.05, faceW * 0.7, faceH * 0.3);
  ctx.fill();

  // ── Hair ──
  // Back hair volume
  ctx.fillStyle = HAIR;
  ctx.beginPath();
  ctx.ellipse(0, -15 * scale, 80 * scale, 85 * scale, 0, Math.PI, Math.PI * 2);
  ctx.fill();

  // Side hair
  ctx.fillStyle = HAIR;
  ctx.beginPath();
  ctx.ellipse(-68 * scale, -5 * scale, 20 * scale, 65 * scale, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(68 * scale, -5 * scale, 20 * scale, 65 * scale, -0.15, 0, Math.PI * 2);
  ctx.fill();

  // Top hair with parting
  ctx.fillStyle = HAIR;
  ctx.beginPath();
  ctx.moveTo(-75 * scale, -20 * scale);
  ctx.quadraticCurveTo(-60 * scale, -95 * scale, -5 * scale, -88 * scale);
  ctx.quadraticCurveTo(20 * scale, -92 * scale, 55 * scale, -75 * scale);
  ctx.quadraticCurveTo(78 * scale, -55 * scale, 75 * scale, -20 * scale);
  ctx.quadraticCurveTo(72 * scale, -60 * scale, 40 * scale, -72 * scale);
  ctx.quadraticCurveTo(10 * scale, -78 * scale, -20 * scale, -72 * scale);
  ctx.quadraticCurveTo(-55 * scale, -60 * scale, -75 * scale, -20 * scale);
  ctx.closePath();
  ctx.fill();

  // Hair highlight
  ctx.strokeStyle = HAIR_HIGHLIGHT;
  ctx.lineWidth = 2 * scale;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.moveTo(-30 * scale, -82 * scale);
  ctx.quadraticCurveTo(-10 * scale, -88 * scale, 15 * scale, -80 * scale);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // ── Ears ──
  const earY = -5 * scale;
  [-1, 1].forEach(side => {
    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.ellipse(side * 70 * scale, earY, 8 * scale, 14 * scale, side * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = SKIN_SHADOW;
    ctx.beginPath();
    ctx.ellipse(side * 71 * scale, earY, 4 * scale, 8 * scale, side * 0.2, 0, Math.PI * 2);
    ctx.fill();
  });

  // ── Eyebrows ──
  const browY = -32 * scale - s.browLift * 10 * scale;
  ctx.strokeStyle = EYEBROW;
  ctx.lineWidth = 2.5 * scale;
  ctx.lineCap = "round";
  [-1, 1].forEach(side => {
    ctx.beginPath();
    const bx = side * 26 * scale;
    ctx.moveTo(bx - side * 16 * scale, browY + 2 * scale);
    ctx.quadraticCurveTo(bx, browY - 4 * scale, bx + side * 16 * scale, browY + 1 * scale);
    ctx.stroke();
  });

  // ── Eyes ──
  const eyeY = -18 * scale;
  const blinkClose = s.isBlinking ? (s.blinkProgress <= 1 ? s.blinkProgress : 2 - s.blinkProgress) : 0;
  const eyeOpenness = 1 - blinkClose;

  [-1, 1].forEach(side => {
    const ex = side * 26 * scale;

    // Eye white
    ctx.fillStyle = EYE_WHITE;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY, 14 * scale, 10 * scale * eyeOpenness, 0, 0, Math.PI * 2);
    ctx.fill();

    if (eyeOpenness > 0.1) {
      // Iris
      const irisX = ex + s.eyeX * 6 * scale;
      const irisY = eyeY + s.eyeY * 4 * scale;
      const irisGrad = ctx.createRadialGradient(irisX, irisY - 2 * scale, 1 * scale, irisX, irisY, 7 * scale);
      irisGrad.addColorStop(0, IRIS);
      irisGrad.addColorStop(0.6, IRIS_INNER);
      irisGrad.addColorStop(1, "#2A5A4E");
      ctx.fillStyle = irisGrad;
      ctx.beginPath();
      ctx.ellipse(irisX, irisY, 7 * scale, 7 * scale * eyeOpenness, 0, 0, Math.PI * 2);
      ctx.fill();

      // Pupil
      ctx.fillStyle = PUPIL;
      ctx.beginPath();
      ctx.ellipse(irisX, irisY, 3.5 * scale, 3.5 * scale * eyeOpenness, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye highlight
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.beginPath();
      ctx.ellipse(irisX + 2 * scale, irisY - 2 * scale, 2 * scale, 1.8 * scale * eyeOpenness, 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Upper eyelid line / lashes
      ctx.strokeStyle = LASH;
      ctx.lineWidth = 1.8 * scale;
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, 14 * scale, 10 * scale, 0, Math.PI + 0.1, -0.1);
      ctx.stroke();

      // Lower lash line (subtle)
      ctx.strokeStyle = "rgba(42,26,16,0.3)";
      ctx.lineWidth = 0.8 * scale;
      ctx.beginPath();
      ctx.ellipse(ex, eyeY, 13 * scale, 9 * scale, 0, 0.15, Math.PI - 0.15);
      ctx.stroke();
    }
  });

  // ── Nose ──
  ctx.strokeStyle = NOSE_SHADOW;
  ctx.lineWidth = 1.5 * scale;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-1 * scale, -5 * scale);
  ctx.quadraticCurveTo(-4 * scale, 8 * scale, -6 * scale, 12 * scale);
  ctx.quadraticCurveTo(-2 * scale, 16 * scale, 2 * scale, 16 * scale);
  ctx.quadraticCurveTo(6 * scale, 16 * scale, 6 * scale, 12 * scale);
  ctx.stroke();

  // Nostril hints
  ctx.fillStyle = NOSE_SHADOW;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.ellipse(-5 * scale, 14 * scale, 3 * scale, 1.5 * scale, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(5 * scale, 14 * scale, 3 * scale, 1.5 * scale, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // ── Blush ──
  ctx.fillStyle = BLUSH;
  ctx.beginPath();
  ctx.ellipse(-32 * scale, 8 * scale, 14 * scale, 8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(32 * scale, 8 * scale, 14 * scale, 8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // ── Mouth ──
  const mouthY = 32 * scale;
  const mw = 22 * scale * s.mouthWidth;
  const mh = Math.max(1, 14 * scale * s.mouthHeight);
  const smileCurve = s.smile * 6 * scale;

  if (s.mouthHeight > 0.12) {
    // Open mouth
    ctx.fillStyle = "#3A1A1A";
    ctx.beginPath();
    if (s.mouthRound > 0.6) {
      ctx.ellipse(0, mouthY, mw * 0.5, mh * 0.55, 0, 0, Math.PI * 2);
    } else {
      ctx.moveTo(-mw, mouthY);
      ctx.quadraticCurveTo(-mw * 0.5, mouthY - mh * 0.3, 0, mouthY - mh * 0.2);
      ctx.quadraticCurveTo(mw * 0.5, mouthY - mh * 0.3, mw, mouthY);
      ctx.quadraticCurveTo(mw * 0.5, mouthY + mh, 0, mouthY + mh * 1.1);
      ctx.quadraticCurveTo(-mw * 0.5, mouthY + mh, -mw, mouthY);
    }
    ctx.fill();

    // Teeth hint
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    const teethW = mw * 0.7;
    const teethH = mh * 0.25;
    ctx.roundRect(-teethW, mouthY - teethH * 0.5, teethW * 2, teethH, 2 * scale);
    ctx.fill();

    // Tongue hint for open vowels
    if (s.mouthHeight > 0.35) {
      ctx.fillStyle = "#C45A52";
      ctx.beginPath();
      ctx.ellipse(0, mouthY + mh * 0.5, mw * 0.35, mh * 0.2, 0, 0, Math.PI);
      ctx.fill();
    }

    // Lips outline
    ctx.strokeStyle = LIP;
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    if (s.mouthRound > 0.6) {
      ctx.ellipse(0, mouthY, mw * 0.55, mh * 0.6, 0, 0, Math.PI * 2);
    } else {
      ctx.moveTo(-mw - 2 * scale, mouthY);
      ctx.quadraticCurveTo(0, mouthY - mh * 0.5, mw + 2 * scale, mouthY);
      ctx.moveTo(-mw - 2 * scale, mouthY);
      ctx.quadraticCurveTo(0, mouthY + mh * 1.2, mw + 2 * scale, mouthY);
    }
    ctx.stroke();
  } else {
    // Closed mouth / smile
    ctx.strokeStyle = LIP;
    ctx.lineWidth = 2.2 * scale;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-mw, mouthY);
    ctx.quadraticCurveTo(0, mouthY + smileCurve, mw, mouthY);
    ctx.stroke();

    // Upper lip
    ctx.strokeStyle = LIP_DARK;
    ctx.lineWidth = 1.2 * scale;
    ctx.beginPath();
    ctx.moveTo(-mw * 0.8, mouthY - 1 * scale);
    ctx.quadraticCurveTo(-mw * 0.3, mouthY - 3 * scale, 0, mouthY - 2 * scale);
    ctx.quadraticCurveTo(mw * 0.3, mouthY - 3 * scale, mw * 0.8, mouthY - 1 * scale);
    ctx.stroke();
  }

  ctx.restore();
  ctx.restore();
}

// ─── TTS Engine ──────────────────────────────────────────────────────
function getVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() || [];
  // Prefer natural/female English voices
  const preferred = [
    "Samantha", "Karen", "Moira", "Fiona", "Victoria",
    "Google UK English Female", "Microsoft Zira", "Google US English",
  ];
  for (const name of preferred) {
    const v = voices.find(v => v.name.includes(name));
    if (v) return v;
  }
  // Fallback: any English female-sounding voice
  const english = voices.filter(v => v.lang.startsWith("en"));
  return english[0] || voices[0] || null;
}

// ─── Component ───────────────────────────────────────────────────────
export const MiaDigitalHuman = forwardRef<MiaDigitalHumanRef, MiaDigitalHumanProps>(
  ({ mood = "neutral", size = "md", className = "", speaking = false, onSpeechEnd }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stateRef = useRef<AnimState>(createInitialState());
    const isSpeakingRef = useRef(false);
    const rafRef = useRef<number>(0);
    const lastTimeRef = useRef(0);
    const visemeQueueRef = useRef<string[]>([]);
    const visemeIndexRef = useRef(0);
    const visemeTimerRef = useRef(0);
    const [isSpeakingState, setIsSpeakingState] = useState(false);

    const px = SIZE_MAP[size];

    // Set mood
    useEffect(() => {
      const s = stateRef.current;
      if (s.targetMood !== mood) {
        s.targetMood = mood;
        s.moodTransition = 0;
      }
    }, [mood]);

    // Speaking state from prop
    useEffect(() => {
      isSpeakingRef.current = speaking;
    }, [speaking]);

    // Speak function
    const speak = useCallback((text: string) => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const voice = getVoice();
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      utterance.pitch = 1.1;
      utterance.volume = 0.9;

      // Build viseme queue from text
      const chars = text.replace(/[^a-zA-Z\s]/g, "").split("");
      visemeQueueRef.current = chars.map(c => c === " " ? "rest" : charToViseme(c));
      visemeIndexRef.current = 0;
      visemeTimerRef.current = 0;

      isSpeakingRef.current = true;
      setIsSpeakingState(true);
      stateRef.current.targetMood = "speaking";
      stateRef.current.moodTransition = 0;

      utterance.onend = () => {
        isSpeakingRef.current = false;
        setIsSpeakingState(false);
        stateRef.current.mouthTargetWidth = 1.0;
        stateRef.current.mouthTargetHeight = 0.08;
        stateRef.current.mouthTargetRound = 0.3;
        visemeQueueRef.current = [];
        onSpeechEnd?.();
      };

      utterance.onerror = () => {
        isSpeakingRef.current = false;
        setIsSpeakingState(false);
        visemeQueueRef.current = [];
      };

      // Ensure voices are loaded
      if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
          const v = getVoice();
          if (v) utterance.voice = v;
          window.speechSynthesis.speak(utterance);
        };
      } else {
        window.speechSynthesis.speak(utterance);
      }
    }, [onSpeechEnd]);

    const stopSpeaking = useCallback(() => {
      window.speechSynthesis?.cancel();
      isSpeakingRef.current = false;
      setIsSpeakingState(false);
      visemeQueueRef.current = [];
      stateRef.current.mouthTargetWidth = 1.0;
      stateRef.current.mouthTargetHeight = 0.08;
      stateRef.current.mouthTargetRound = 0.3;
    }, []);

    const setMoodFn = useCallback((m: MiaMood) => {
      stateRef.current.targetMood = m;
      stateRef.current.moodTransition = 0;
    }, []);

    useImperativeHandle(ref, () => ({ speak, stopSpeaking, setMood: setMoodFn }), [speak, stopSpeaking, setMoodFn]);

    // Animation loop
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = px * dpr;
      canvas.height = px * dpr;
      canvas.style.width = `${px}px`;
      canvas.style.height = `${px}px`;

      lastTimeRef.current = performance.now();

      const animate = (time: number) => {
        const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
        lastTimeRef.current = time;

        const s = stateRef.current;
        const currentlySpeaking = isSpeakingRef.current;

        // Advance viseme queue
        if (currentlySpeaking && visemeQueueRef.current.length > 0) {
          visemeTimerRef.current += dt;
          const visemeSpeed = 0.06; // seconds per viseme
          while (visemeTimerRef.current >= visemeSpeed && visemeIndexRef.current < visemeQueueRef.current.length) {
            visemeTimerRef.current -= visemeSpeed;
            const viseme = visemeQueueRef.current[visemeIndexRef.current];
            const shape = VISEMES[viseme] || VISEMES.rest;
            s.mouthTargetWidth = shape[0];
            s.mouthTargetHeight = shape[1];
            s.mouthTargetRound = shape[2];
            visemeIndexRef.current++;
          }
          if (visemeIndexRef.current >= visemeQueueRef.current.length) {
            // Loop or hold last
            visemeIndexRef.current = 0;
          }
        } else if (!currentlySpeaking) {
          s.mouthTargetWidth = 1.0;
          s.mouthTargetHeight = 0.08;
          s.mouthTargetRound = 0.3;
        }

        updateState(s, dt, currentlySpeaking);
        drawMia(ctx, px, px, s, currentlySpeaking);

        rafRef.current = requestAnimationFrame(animate);
      };

      rafRef.current = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(rafRef.current);
      };
    }, [px]);

    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        {/* Ambient glow ring */}
        {(isSpeakingState || speaking) && (
          <div
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: "radial-gradient(circle, rgba(74,124,111,0.2) 0%, transparent 70%)",
              transform: "scale(1.3)",
            }}
          />
        )}
        <canvas
          ref={canvasRef}
          className="rounded-full"
          style={{ width: px, height: px }}
        />
      </div>
    );
  }
);

MiaDigitalHuman.displayName = "MiaDigitalHuman";

// ─── Wrapper Components ──────────────────────────────────────────────
// Drop-in replacements for the static Mia components

interface MiaLiveGreetingProps {
  userName?: string;
  greeting: string;
  subtitle: string;
  mood?: MiaMood;
  speakOnMount?: boolean;
  onVoiceInput?: (transcript: string) => void;
}

export function MiaLiveGreeting({ userName, greeting, subtitle, mood = "neutral", speakOnMount = false }: MiaLiveGreetingProps) {
  const miaRef = useRef<MiaDigitalHumanRef>(null);
  const hasSpoken = useRef(false);

  useEffect(() => {
    if (speakOnMount && !hasSpoken.current && miaRef.current) {
      hasSpoken.current = true;
      const name = userName ? `, ${userName.split(" ")[0]}` : "";
      const text = `Hi${name}. ${subtitle}`;
      // Small delay so the canvas is ready
      setTimeout(() => miaRef.current?.speak(text), 500);
    }
  }, [speakOnMount, userName, subtitle]);

  return (
    <div className="flex items-start gap-5">
      <MiaDigitalHuman ref={miaRef} mood={mood} size="lg" />
      <div className="flex-1 min-w-0 pt-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-primary tracking-wider uppercase">Mia</span>
          <span className="text-[10px] text-muted-foreground">My Integrity Assistant</span>
        </div>
        <h2 className="text-xl font-semibold tracking-tight">{greeting}</h2>
        <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}

interface MiaLiveMessageProps {
  content: string;
  mood?: MiaMood;
  speakContent?: boolean;
}

export function MiaLiveMessage({ content, mood = "speaking", speakContent = false }: MiaLiveMessageProps) {
  const miaRef = useRef<MiaDigitalHumanRef>(null);
  const hasSpoken = useRef(false);

  useEffect(() => {
    if (speakContent && !hasSpoken.current && miaRef.current && content) {
      hasSpoken.current = true;
      // Speak a summary (first 200 chars) to avoid very long speech
      const summary = content.length > 200 ? content.substring(0, 200) + "..." : content;
      setTimeout(() => miaRef.current?.speak(summary), 300);
    }
  }, [speakContent, content]);

  return (
    <div className="flex items-start gap-4">
      <MiaDigitalHuman ref={miaRef} mood={mood} size="md" />
      <div className="flex-1 min-w-0 bg-muted/50 rounded-xl p-4 border border-border/30">
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
          {content}
        </div>
      </div>
    </div>
  );
}

export default MiaDigitalHuman;
