import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Streamdown } from "streamdown";
import { VoiceButton } from "@/components/VoiceButton";

export type MiaMood = "neutral" | "thinking" | "speaking" | "happy" | "concerned";

// ─── Avatar context hook (safe fallback if not wrapped) ─────────────────────
function useAvatarSafe() {
  try {
    // Dynamic import to avoid circular deps — we use a simple approach
    const ctx = (window as any).__miaAvatarCtx;
    if (ctx) return ctx;
  } catch {}
  return {
    avatar: {
      imageUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663316543184/kgeOWTiacrGPkfVZ.png",
      name: "Mia",
    },
    agentName: "Mia",
    voiceEnabled: true,
  };
}

// We'll use a global event to sync avatar context
let _avatarUrl = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663316543184/kgeOWTiacrGPkfVZ.png";
let _agentName = "Mia";
let _voiceEnabled = true;
const _listeners = new Set<() => void>();

export function setMiaGlobalConfig(url: string, name: string, voice: boolean) {
  _avatarUrl = url;
  _agentName = name;
  _voiceEnabled = voice;
  _listeners.forEach((fn) => fn());
}

function useMiaConfig() {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const listener = () => forceUpdate((n) => n + 1);
    _listeners.add(listener);
    return () => { _listeners.delete(listener); };
  }, []);
  return { avatarUrl: _avatarUrl, agentName: _agentName, voiceEnabled: _voiceEnabled };
}

// ─── TTS Helper ─────────────────────────────────────────────────────────────
function speakText(text: string, onEnd?: () => void) {
  if (!_voiceEnabled || !window.speechSynthesis) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1.05;
  // Try to find a good female voice
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(
    (v) => v.name.includes("Samantha") || v.name.includes("Google UK English Female") || v.name.includes("Microsoft Zira")
  );
  if (preferred) utterance.voice = preferred;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}

// ─── Typing indicator dots ────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full bg-primary/60"
          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

// ─── Photo Avatar with breathing/glow animation ─────────────────────────────
const SIZE_PX: Record<string, number> = { sm: 48, md: 80, lg: 140, xl: 220 };

export function MiaAvatar({
  mood = "neutral",
  size = "md",
  showGlow = true,
}: {
  mood?: MiaMood;
  size?: "sm" | "md" | "lg" | "xl";
  showGlow?: boolean;
}) {
  const { avatarUrl } = useMiaConfig();
  const px = SIZE_PX[size] || 80;

  const glowColor =
    mood === "speaking" ? "rgba(99,102,241,0.35)" :
    mood === "thinking" ? "rgba(234,179,8,0.3)" :
    mood === "happy" ? "rgba(34,197,94,0.3)" :
    mood === "concerned" ? "rgba(239,68,68,0.3)" :
    "rgba(99,102,241,0.15)";

  return (
    <motion.div
      className="relative rounded-full overflow-hidden shrink-0"
      style={{ width: px, height: px }}
      animate={{
        scale: mood === "speaking" ? [1, 1.03, 1] : [1, 1.01, 1],
        boxShadow: showGlow
          ? [
              `0 0 0px 0px ${glowColor}`,
              `0 0 ${px * 0.15}px ${px * 0.06}px ${glowColor}`,
              `0 0 0px 0px ${glowColor}`,
            ]
          : "none",
      }}
      transition={{
        duration: mood === "speaking" ? 1.2 : 3,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <img
        src={avatarUrl}
        alt="AI Assistant"
        className="w-full h-full object-cover object-top"
        draggable={false}
      />
      {/* Mood overlay */}
      {mood === "thinking" && (
        <motion.div
          className="absolute inset-0 bg-yellow-500/10"
          animate={{ opacity: [0, 0.15, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      {mood === "speaking" && (
        <motion.div
          className="absolute inset-0 border-2 border-primary/40 rounded-full"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
}

// ─── Speech Bubble ────────────────────────────────────────────────────────
export function MiaSpeechBubble({
  children,
  isTyping = false,
  className = "",
}: {
  children?: React.ReactNode;
  isTyping?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`relative bg-card border border-border/60 rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm max-w-full ${className}`}
    >
      <div className="absolute -left-2 top-4 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-border/60" />
      <div className="absolute -left-[6px] top-4 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-card" />
      {isTyping ? <TypingDots /> : children}
    </motion.div>
  );
}

// ─── Mia Message (avatar + bubble together) ───────────────────────────────
export function MiaMessage({
  content,
  mood = "neutral",
  isTyping = false,
  avatarSize = "md",
  className = "",
  speakContent = false,
}: {
  content?: string;
  mood?: MiaMood;
  isTyping?: boolean;
  avatarSize?: "sm" | "md" | "lg";
  className?: string;
  speakContent?: boolean;
}) {
  const { agentName, voiceEnabled } = useMiaConfig();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const hasSpoken = useRef(false);

  useEffect(() => {
    if (speakContent && voiceEnabled && !hasSpoken.current && content) {
      hasSpoken.current = true;
      const summary = content.length > 250 ? content.substring(0, 250) + "..." : content;
      setTimeout(() => {
        setIsSpeaking(true);
        speakText(summary, () => setIsSpeaking(false));
      }, 400);
    }
  }, [speakContent, content, voiceEnabled]);

  const activeMood = isSpeaking ? "speaking" : isTyping ? "thinking" : mood;

  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="shrink-0 pt-1">
        <MiaAvatar mood={activeMood} size={avatarSize} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-1.5 ml-1">{agentName}</p>
        <MiaSpeechBubble isTyping={isTyping}>
          {content && (
            <div className="text-sm leading-relaxed text-foreground prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
              <Streamdown>{content}</Streamdown>
            </div>
          )}
        </MiaSpeechBubble>
      </div>
    </div>
  );
}

// ─── Mia Conversation Panel (full chat-like experience) ───────────────────
export function MiaConversation({
  messages,
  isLoading = false,
  className = "",
}: {
  messages: Array<{ role: "mia" | "user"; content: string; mood?: MiaMood }>;
  isLoading?: boolean;
  className?: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className={`space-y-4 ${className}`}>
      <AnimatePresence mode="popLayout">
        {messages.map((msg, i) =>
          msg.role === "mia" ? (
            <MiaMessage key={i} content={msg.content} mood={msg.mood || "speaking"} />
          ) : (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-end"
            >
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-5 py-3 max-w-[80%] shadow-sm">
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>
      {isLoading && <MiaMessage isTyping mood="thinking" />}
      <div ref={bottomRef} />
    </div>
  );
}

// ─── Mia Greeting Card (for dashboard hero) ──────────────────────────────
export function MiaGreeting({
  userName,
  greeting,
  subtitle,
  actions,
  mood = "neutral",
  onVoiceInput,
  speakOnMount = false,
}: {
  userName?: string;
  greeting?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  mood?: MiaMood;
  onVoiceInput?: (text: string) => void;
  speakOnMount?: boolean;
}) {
  const { agentName, voiceEnabled } = useMiaConfig();
  const [displayGreeting, setDisplayGreeting] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const fullGreeting = greeting || getTimeGreeting(userName);
  const hasSpoken = useRef(false);

  // Typewriter effect
  useEffect(() => {
    setDisplayGreeting("");
    let idx = 0;
    const interval = setInterval(() => {
      if (idx < fullGreeting.length) {
        setDisplayGreeting(fullGreeting.slice(0, idx + 1));
        idx++;
      } else {
        clearInterval(interval);
      }
    }, 25);
    return () => clearInterval(interval);
  }, [fullGreeting]);

  // Speak on mount
  useEffect(() => {
    if (speakOnMount && voiceEnabled && !hasSpoken.current) {
      hasSpoken.current = true;
      const name = userName ? `, ${userName.split(" ")[0]}` : "";
      const text = subtitle ? `Hi${name}. ${subtitle}` : fullGreeting;
      setTimeout(() => {
        setIsSpeaking(true);
        speakText(text, () => setIsSpeaking(false));
      }, 600);
    }
  }, [speakOnMount, userName, subtitle, fullGreeting, voiceEnabled]);

  const activeMood = isSpeaking ? "speaking" : mood;

  return (
    <div className="flex items-start gap-5">
      <div className="shrink-0">
        <MiaAvatar mood={activeMood} size="lg" />
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">{agentName}</span>
          <span className="text-[10px] text-muted-foreground">My Integrity Assistant</span>
        </div>
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
          {displayGreeting}
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="inline-block w-0.5 h-5 bg-primary ml-0.5 align-middle"
          />
        </h1>
        {subtitle && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-2xl"
          >
            {subtitle}
          </motion.p>
        )}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="flex items-center gap-3 mt-3"
        >
          {onVoiceInput && (
            <VoiceButton onTranscript={onVoiceInput} size="default" variant="outline" showLabel />
          )}
          {actions}
        </motion.div>
      </div>
    </div>
  );
}

// ─── Mia Insight Card (proactive insight bubble) ─────────────────────────
export function MiaInsight({
  title,
  content,
  type = "info",
  action,
  onAction,
}: {
  title: string;
  content: string;
  type?: "info" | "warning" | "success" | "alert";
  action?: string;
  onAction?: () => void;
}) {
  const colorMap = {
    info: "border-l-primary bg-primary/5",
    warning: "border-l-warning bg-warning/5",
    success: "border-l-success bg-success/5",
    alert: "border-l-destructive bg-destructive/5",
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      className={`border-l-3 rounded-r-lg p-4 ${colorMap[type]}`}
    >
      <div className="flex items-start gap-3">
        <MiaAvatar mood="speaking" size="sm" showGlow={false} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{content}</p>
          {action && onAction && (
            <button
              onClick={onAction}
              className="text-xs font-medium text-primary hover:text-primary/80 mt-2 transition-colors"
            >
              {action} →
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Mia Section Header ─────────────────────────────────────────────────
export function MiaSection({
  title,
  description,
  mood = "neutral",
  children,
}: {
  title: string;
  description?: string;
  mood?: MiaMood;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <MiaAvatar mood={mood} size="sm" showGlow={false} />
        <div className="pt-0.5">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// ─── Quick Action Chips ────────────────────────────────────────────────
export function MiaQuickActions({
  actions,
}: {
  actions: Array<{ label: string; icon?: React.ReactNode; onClick: () => void }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action, i) => (
        <motion.button
          key={i}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.08 }}
          onClick={action.onClick}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium bg-secondary hover:bg-accent text-secondary-foreground border border-border/50 hover:border-primary/30 transition-all hover:shadow-sm"
        >
          {action.icon}
          {action.label}
        </motion.button>
      ))}
    </div>
  );
}

// ─── Helper ──────────────────────────────────────────────────────────────
function getTimeGreeting(name?: string) {
  const hour = new Date().getHours();
  const nameStr = name ? `, ${name.split(" ")[0]}` : "";
  if (hour < 12) return `Good morning${nameStr}. Let's check in on operations.`;
  if (hour < 17) return `Good afternoon${nameStr}. Here's your ops overview.`;
  return `Good evening${nameStr}. Let me catch you up.`;
}
