import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Settings2, Volume2, VolumeX, Pencil } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAvatar } from "@/contexts/AvatarContext";
import { AVATAR_OPTIONS, type AvatarOption } from "@/lib/avatars";
import { MiaMessage } from "@/components/Mia";

export default function AgentSettings() {
  const { avatarId, agentName, voiceEnabled, setAvatarId, setAgentName, setVoiceEnabled } = useAvatar();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(agentName);

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

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Settings2 className="h-6 w-6 text-primary" />
          Agent Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize your AI assistant's appearance, name, and behavior.
        </p>
      </div>

      <MiaMessage
        content="This is where you can personalize me. Choose how I look, what I'm called, and whether I speak aloud. Make me yours."
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
                {/* Avatar Image */}
                <div className="aspect-[3/4] overflow-hidden bg-muted">
                  <img
                    src={option.imageUrl}
                    alt={option.name}
                    className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>

                {/* Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 pt-10">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{option.name}</span>
                    {option.gender === "male" && (
                      <span className="text-[10px] font-medium text-white/70 bg-white/20 px-1.5 py-0.5 rounded">Male</span>
                    )}
                  </div>
                  <p className="text-xs text-white/70 mt-0.5 line-clamp-2">{option.description}</p>
                </div>

                {/* Selected Badge */}
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
