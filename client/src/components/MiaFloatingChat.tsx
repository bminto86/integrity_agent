import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MiaAvatar } from "@/components/Mia";
import { VoiceButton } from "@/components/VoiceButton";
import { useTTS } from "@/hooks/useTTS";
import { useAvatar } from "@/contexts/AvatarContext";
import { trpc } from "@/lib/trpc";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import {
  MessageCircle, X, Send, Volume2, VolumeX, Loader2, Trash2, Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Persist messages across page navigation within session
let _sessionMessages: ChatMessage[] = [];

export function MiaFloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(_sessionMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceResponseEnabled, setVoiceResponseEnabled] = useState(true);
  const [hasUnread, setHasUnread] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { voiceEnabled } = useAvatar();

  const { speak, stop, isSpeaking } = useTTS({
    enabled: voiceResponseEnabled && voiceEnabled,
    onEnd: () => {},
  });

  const chatMutation = trpc.mia.chat.useMutation();

  // Sync session messages
  useEffect(() => {
    _sessionMessages = messages;
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isLoading) return;

    const userMsg: ChatMessage = { role: "user", content: msg, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const result = await chatMutation.mutateAsync({ message: msg });
      const content = typeof result === "string" ? result : (result as any)?.response || "I'm here to help. Could you rephrase that?";
      const assistantMsg: ChatMessage = { role: "assistant", content, timestamp: new Date() };
      setMessages((prev) => [...prev, assistantMsg]);

      if (voiceResponseEnabled && voiceEnabled) {
        const summary = content.length > 300 ? content.substring(0, 300) + "..." : content;
        speak(summary);
      }
    } catch (err: any) {
      toast.error("Mia couldn't respond", { description: err.message || "Please try again." });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, chatMutation, voiceResponseEnabled, voiceEnabled, speak]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearHistory = () => {
    stop();
    setMessages([]);
    _sessionMessages = [];
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsOpen(true)}
                  className="relative group"
                >
                  {/* Outer pulse ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-primary/20"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  />
                  {/* Button body */}
                  <div className="relative w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/25 flex items-center justify-center group-hover:shadow-xl group-hover:shadow-primary/30 transition-shadow overflow-hidden">
                    <MiaAvatar mood="neutral" size="sm" showGlow={false} />
                    {/* Unread indicator */}
                    {hasUnread && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full border-2 border-background flex items-center justify-center"
                      >
                        <span className="text-[8px] text-white font-bold">!</span>
                      </motion.div>
                    )}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-xs">Talk to Mia</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-6rem)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-card/80 backdrop-blur shrink-0">
              <div className="flex items-center gap-3">
                <MiaAvatar mood={isLoading ? "thinking" : isSpeaking ? "speaking" : "neutral"} size="sm" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Mia</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {isLoading ? "Thinking..." : isSpeaking ? "Speaking..." : "My Integrity Assistant"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setVoiceResponseEnabled(!voiceResponseEnabled)}
                    >
                      {voiceResponseEnabled ? (
                        <Volume2 className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">{voiceResponseEnabled ? "Mute voice" : "Enable voice"}</p>
                  </TooltipContent>
                </Tooltip>
                {messages.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearHistory}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs">Clear chat</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                      <Minimize2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Minimize</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-8">
                  <MiaAvatar mood="happy" size="lg" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Hi, I'm Mia</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-[250px]">
                      Ask me anything about your operations — vendors, metrics, tasks, quality, or workforce planning.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {[
                      "How are my vendors performing?",
                      "Any overdue tasks?",
                      "Summarize active alerts",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSend(suggestion)}
                        className="text-[11px] px-3 py-1.5 rounded-full border border-border/60 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {msg.role === "assistant" ? (
                    <div className="flex items-start gap-2.5">
                      <div className="shrink-0 pt-0.5">
                        <MiaAvatar mood="speaking" size="sm" showGlow={false} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground mb-1 ml-0.5">Mia</p>
                        <div className="bg-card border border-border/60 rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm">
                          <div className="text-sm leading-relaxed text-foreground prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
                            <Streamdown>{msg.content}</Streamdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[85%] shadow-sm">
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5"
                >
                  <div className="shrink-0 pt-0.5">
                    <MiaAvatar mood="thinking" size="sm" />
                  </div>
                  <div className="bg-card border border-border/60 rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm">
                    <div className="flex items-center gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-primary/50"
                          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input Area */}
            <div className="shrink-0 border-t bg-card/50 p-3">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Mia anything..."
                  disabled={isLoading}
                  className="flex-1 h-10 rounded-xl border border-border/60 bg-background px-3.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 disabled:opacity-50 transition-all"
                />
                <VoiceButton
                  onTranscript={(text) => handleSend(text)}
                  size="sm"
                  variant="ghost"
                />
                <Button
                  size="icon"
                  className="h-10 w-10 rounded-xl shrink-0"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                Mia has full context of your vendors, metrics, tasks, and alerts.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
