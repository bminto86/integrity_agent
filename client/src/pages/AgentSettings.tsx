import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Settings2, Volume2, VolumeX, Pencil, MessageSquare, Sparkles, Play, Square } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAvatar } from "@/contexts/AvatarContext";
import { AVATAR_OPTIONS, type AvatarOption } from "@/lib/avatars";
import { MiaMessage } from "@/components/Mia";
import { useTTS } from "@/hooks/useTTS";

const TONE_OPTIONS = [
  { value: "professional", label: "Professional", description: "Clear, business-appropriate language" },
  { value: "casual", label: "Casual", description: "Relaxed, everyday conversational style" },
  { value: "friendly", label: "Friendly", description: "Warm, approachable, and encouraging" },
  { value: "direct", label: "Direct", description: "Straight to the point, no fluff" },
  { value: "empathetic", label: "Empathetic", description: "Understanding, supportive, emotionally aware" },
];

const VERBOSITY_OPTIONS = [
  { value: "concise", label: "Concise", description: "Short, punchy responses. Bullet points preferred." },
  { value: "balanced", label: "Balanced", description: "Enough detail to be useful without being verbose." },
  { value: "detailed", label: "Detailed", description: "Thorough explanations with context and examples." },
];

const FORMALITY_OPTIONS = [
  { value: "formal", label: "Formal", description: "Corporate language, structured sentences" },
  { value: "conversational", label: "Conversational", description: "Natural flow, like talking to a colleague" },
  { value: "casual", label: "Casual", description: "Informal, relaxed, like talking to a friend" },
];

const PERSONALITY_TRAITS = [
  "supportive", "analytical", "encouraging", "no-nonsense", "strategic",
  "data-driven", "creative", "pragmatic", "optimistic", "cautious",
  "humorous", "empathetic", "decisive", "collaborative", "proactive",
];

export default function AgentSettings() {
  const {
    avatarId, agentName, voiceEnabled, responseStyle,
    setAvatarId, setAgentName, setVoiceEnabled, setResponseStyle,
  } = useAvatar();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(agentName);
  const [customInstructions, setCustomInstructions] = useState(responseStyle.responseCustomInstructions);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);

  const tts = useTTS({
    enabled: voiceEnabled,
    onEnd: () => setPreviewingVoice(null),
  });

  const selectedTraits = responseStyle.responsePersonality
    ? responseStyle.responsePersonality.split(",").map(t => t.trim()).filter(Boolean)
    : [];

  const toggleTrait = (trait: string) => {
    const current = [...selectedTraits];
    const idx = current.indexOf(trait);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      if (current.length >= 5) {
        toast.error("Maximum 5 personality traits");
        return;
      }
      current.push(trait);
    }
    setResponseStyle({ responsePersonality: current.join(", ") });
    toast.success("Personality updated");
  };

  const handleSelectAvatar = (option: AvatarOption) => {
    setAvatarId(option.id);
    toast.success(`Avatar updated to ${option.name}`);
  };

  const handleSaveName = () => {
    if (nameInput.trim()) {
      setAgentName(nameInput.trim());
      setEditingName(false);
      toast.success(`Agent renamed to ${nameInput.trim()}`);
    }
  };

  const handleSaveCustomInstructions = () => {
    setResponseStyle({ responseCustomInstructions: customInstructions });
    toast.success("Custom instructions saved");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-primary" />
          Agent Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize your AI assistant's appearance, voice, and communication style.
        </p>
      </div>

      <MiaMessage
        content="This is where you shape how I communicate with you. Adjust my tone, how much detail I give, and even my personality. Try different combinations to find what works best for your workflow."
        mood="happy"
        avatarSize="sm"
      />

      {/* Agent Name */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent Name</CardTitle>
          <CardDescription>What would you like to call your assistant?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {editingName ? (
              <>
                <Input
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="max-w-xs"
                  placeholder="Enter a name..."
                  onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
                  autoFocus
                />
                <Button size="sm" onClick={handleSaveName}>
                  <Check className="h-4 w-4 mr-1" /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditingName(false); setNameInput(agentName); }}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <span className="text-lg font-semibold text-foreground">{agentName}</span>
                <Button size="sm" variant="ghost" onClick={() => { setEditingName(true); setNameInput(agentName); }}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Voice Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Voice</CardTitle>
          <CardDescription>Enable or disable text-to-speech for your assistant's responses.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {voiceEnabled ? (
                <Volume2 className="h-5 w-5 text-primary" />
              ) : (
                <VolumeX className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <Label className="text-sm font-medium">Speak responses aloud</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {voiceEnabled ? "Your assistant will speak key responses using text-to-speech." : "Voice output is disabled. Responses will be text-only."}
                </p>
              </div>
            </div>
            <Switch
              checked={voiceEnabled}
              onCheckedChange={(checked) => {
                setVoiceEnabled(checked);
                toast.success(checked ? "Voice enabled" : "Voice disabled");
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Voice Selection */}
      {voiceEnabled && tts.availableVoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Voice Selection</CardTitle>
            <CardDescription>
              Choose which voice your assistant uses. Click the play button to preview each voice.
              The best available voice on your device is selected by default.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {tts.availableVoices.map((voice) => {
                const isSelected = tts.selectedVoiceName === voice.name;
                const isPreviewing = previewingVoice === voice.name;
                return (
                  <div
                    key={voice.name}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "border-border/60 hover:border-primary/40 hover:bg-muted/30"
                    }`}
                    onClick={() => {
                      tts.selectVoice(voice.name);
                      toast.success(`Voice set to ${voice.name}`);
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {voice.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {voice.lang} {voice.localService ? "(local)" : "(network)"}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 ml-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isPreviewing) {
                          tts.stop();
                          setPreviewingVoice(null);
                        } else {
                          setPreviewingVoice(voice.name);
                          tts.previewVoice(voice.name);
                        }
                      }}
                    >
                      {isPreviewing ? (
                        <Square className="h-3.5 w-3.5 text-destructive" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
            {tts.selectedVoiceName && (
              <p className="text-xs text-muted-foreground mt-3">
                Currently using: <span className="font-medium text-foreground">{tts.selectedVoiceName}</span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Response Style Section */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Response Style
        </h2>
        <p className="text-sm text-muted-foreground mb-5">
          Control how your assistant communicates. These settings shape the tone, detail level, and personality of every response.
        </p>
      </div>

      {/* Tone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tone</CardTitle>
          <CardDescription>How should your assistant sound when responding?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {TONE_OPTIONS.map((opt) => {
              const isSelected = responseStyle.responseTone === opt.value;
              return (
                <motion.button
                  key={opt.value}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    setResponseStyle({ responseTone: opt.value });
                    toast.success(`Tone set to ${opt.label}`);
                  }}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {opt.label}
                    </span>
                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                </motion.button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Verbosity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verbosity</CardTitle>
          <CardDescription>How much detail should responses include?</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={responseStyle.responseVerbosity}
            onValueChange={(val) => {
              setResponseStyle({ responseVerbosity: val });
              toast.success(`Verbosity set to ${val}`);
            }}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VERBOSITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div>
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-muted-foreground ml-2 text-xs">— {opt.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Formality */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Formality</CardTitle>
          <CardDescription>How formal or casual should the language be?</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={responseStyle.responseFormality}
            onValueChange={(val) => {
              setResponseStyle({ responseFormality: val });
              toast.success(`Formality set to ${val}`);
            }}
          >
            <SelectTrigger className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMALITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div>
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-muted-foreground ml-2 text-xs">— {opt.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Personality Traits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Personality Traits
          </CardTitle>
          <CardDescription>Select up to 5 traits that define your assistant's personality.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {PERSONALITY_TRAITS.map((trait) => {
              const isSelected = selectedTraits.includes(trait);
              return (
                <Badge
                  key={trait}
                  variant={isSelected ? "default" : "outline"}
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    isSelected ? "" : "hover:bg-primary/10"
                  }`}
                  onClick={() => toggleTrait(trait)}
                >
                  {trait}
                  {isSelected && <Check className="h-3 w-3 ml-1" />}
                </Badge>
              );
            })}
          </div>
          {selectedTraits.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Active: {selectedTraits.join(", ")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Custom Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Custom Instructions</CardTitle>
          <CardDescription>
            Add any specific instructions for how your assistant should behave. For example:
            "Always suggest next steps", "Don't use jargon", "Give me the bottom line first".
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g., Always start with a brief summary. Use data to back up points. Keep it under 3 sentences when possible."
              rows={4}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {customInstructions.length}/500 characters
              </p>
              <Button
                size="sm"
                onClick={handleSaveCustomInstructions}
                disabled={customInstructions === responseStyle.responseCustomInstructions}
              >
                <Check className="h-4 w-4 mr-1" /> Save Instructions
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Avatar Selection */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Choose Your Avatar</h2>
        <p className="text-sm text-muted-foreground mb-5">
          Select the appearance for your AI assistant. This will be displayed across the entire platform.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {AVATAR_OPTIONS.map((option) => {
            const isSelected = avatarId === option.id;
            return (
              <motion.button
                key={option.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectAvatar(option)}
                className={`relative group rounded-xl overflow-hidden border-2 transition-all duration-200 text-left ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20 shadow-lg"
                    : "border-border/60 hover:border-primary/40 hover:shadow-md"
                }`}
              >
                <div className="aspect-[3/4] overflow-hidden bg-muted">
                  <img
                    src={option.imageUrl}
                    alt={option.name}
                    className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 pt-10">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{option.name}</span>
                    {option.gender === "male" && (
                      <span className="text-[10px] font-medium text-white/70 bg-white/20 px-1.5 py-0.5 rounded">Male</span>
                    )}
                  </div>
                  <p className="text-xs text-white/70 mt-0.5 line-clamp-2">{option.description}</p>
                </div>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-3 right-3 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg"
                  >
                    <Check className="h-4 w-4 text-primary-foreground" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
