import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { getAvatarById } from "@/lib/avatars";
import { VoiceButton } from "@/components/VoiceButton";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, Send, Trash2, Sparkles, Volume2, VolumeX, Settings, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Streamdown } from "streamdown";

export default function AgentChat() {
  const params = useParams<{ id: string }>();
  const agentId = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [showClear, setShowClear] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: agent, isLoading: agentLoading } = trpc.agents.get.useQuery(
    { id: agentId },
    { enabled: agentId > 0 }
  );
  const { data: messages = [], isLoading: messagesLoading } = trpc.agents.messages.useQuery(
    { agentId },
    { enabled: agentId > 0 }
  );

  const utils = trpc.useUtils();

  const chatMutation = trpc.agents.chat.useMutation({
    onSuccess: (data) => {
      utils.agents.messages.invalidate({ agentId });
      // Speak the reply if voice is enabled
      if (agent?.voiceEnabled && data.reply) {
        speakText(data.reply);
      }
    },
    onError: (err: { message: string }) => toast.error("Failed to get response", { description: err.message }),
  });

  const clearMutation = trpc.agents.clearHistory.useMutation({
    onSuccess: () => {
      utils.agents.messages.invalidate({ agentId });
      setShowClear(false);
      toast.success("Conversation cleared");
    },
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatMutation.isPending]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || chatMutation.isPending) return;
    setInput("");
    chatMutation.mutate({ agentId, message: text });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const speakText = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text.replace(/[#*_`~]/g, ""));
    utterance.rate = 1;
    utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.lang.startsWith("en") && v.name.includes("Female"))
      || voices.find(v => v.lang.startsWith("en"));
    if (preferred) utterance.voice = preferred;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  if (agentLoading || messagesLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center">
        <p className="text-muted-foreground">Agent not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/agents")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Library
        </Button>
      </div>
    );
  }

  const avatar = getAvatarById(agent.avatarId);
  const expertiseTags = agent.expertise?.split(",").map(e => e.trim()).filter(Boolean) || [];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Agent Header */}
      <div className="shrink-0 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/agents")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div className="relative">
            <img
              src={avatar.imageUrl}
              alt={agent.name}
              className="w-11 h-11 rounded-full object-cover ring-2 ring-border"
            />
            <div
              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background"
              style={{ backgroundColor: agent.accentColor || "#6366f1" }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-foreground truncate">{agent.name}</h2>
              {agent.voiceEnabled && (
                <Tooltip>
                  <TooltipTrigger>
                    <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>Voice enabled</TooltipContent>
                </Tooltip>
              )}
            </div>
            {agent.role && (
              <p className="text-xs text-muted-foreground truncate">{agent.role}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isSpeaking && (
              <Button variant="outline" size="sm" onClick={stopSpeaking}>
                <VolumeX className="h-3.5 w-3.5 mr-1" /> Stop
              </Button>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => setLocation("/agents")}>
                  <Settings className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Agent Settings</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setShowClear(true)}
                  disabled={messages.length === 0}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Clear conversation</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Expertise tags */}
        {expertiseTags.length > 0 && (
          <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto">
            {expertiseTags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-[10px] shrink-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="max-w-3xl mx-auto p-4 space-y-4">
          {/* Welcome message if no history */}
          {messages.length === 0 && !chatMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center py-12"
            >
              <img
                src={avatar.imageUrl}
                alt={agent.name}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-border mb-4"
              />
              <h3 className="text-lg font-semibold text-foreground">{agent.name}</h3>
              {agent.role && <p className="text-sm text-muted-foreground">{agent.role}</p>}
              {agent.description && (
                <p className="text-sm text-muted-foreground mt-2 max-w-md">{agent.description}</p>
              )}
              {agent.personality && (
                <p className="text-xs text-muted-foreground/70 mt-2 italic">
                  <Sparkles className="h-3 w-3 inline mr-1" />
                  {agent.personality}
                </p>
              )}
              <Separator className="my-6 max-w-xs" />
              <p className="text-sm text-muted-foreground">
                Start a conversation with {agent.name}. Ask anything related to their expertise.
              </p>
            </motion.div>
          )}

          {/* Message bubbles */}
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <motion.div
                  key={msg.id || idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
                >
                  {/* Avatar */}
                  {!isUser && (
                    <img
                      src={avatar.imageUrl}
                      alt={agent.name}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-border shrink-0 mt-1"
                    />
                  )}

                  {/* Bubble */}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      isUser
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    }`}
                  >
                    {isUser ? (
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="text-sm prose prose-sm dark:prose-invert max-w-none">
                        <Streamdown>{msg.content}</Streamdown>
                      </div>
                    )}
                    <p className={`text-[10px] mt-1.5 ${isUser ? "text-primary-foreground/60" : "text-muted-foreground/60"}`}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  {/* Speak button for assistant messages */}
                  {!isUser && agent.voiceEnabled && (
                    <button
                      onClick={() => speakText(msg.content)}
                      className="self-end mb-2 text-muted-foreground/40 hover:text-primary transition-colors"
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Typing indicator */}
          {chatMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <img
                src={avatar.imageUrl}
                alt={agent.name}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-border shrink-0 mt-1"
              />
              <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t bg-background/95 backdrop-blur-sm p-4">
        <div className="max-w-3xl mx-auto flex gap-2 items-center">
          <VoiceButton
            size="sm"
            variant="ghost"
            onTranscript={(text: string) => {
              setInput(prev => prev + (prev ? " " : "") + text);
              inputRef.current?.focus();
            }}
          />
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${agent.name}...`}
            className="flex-1"
            disabled={chatMutation.isPending}
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim() || chatMutation.isPending}
          >
            {chatMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Clear confirmation */}
      <AlertDialog open={showClear} onOpenChange={setShowClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all messages in this conversation with {agent.name}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => clearMutation.mutate({ agentId })}
            >
              Clear History
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
