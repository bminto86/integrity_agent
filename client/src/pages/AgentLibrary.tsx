import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { MiaGreeting } from "@/components/Mia";
import { AVATAR_OPTIONS, getAvatarById } from "@/lib/avatars";
import { VoiceButton } from "@/components/VoiceButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Plus, Pencil, Trash2, MessageCircle, Bot, Sparkles, Volume2, VolumeX, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ACCENT_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#64748b",
];

interface AgentFormData {
  name: string;
  role: string;
  description: string;
  systemPrompt: string;
  expertise: string;
  personality: string;
  avatarId: string;
  voiceEnabled: boolean;
  accentColor: string;
  responseTone: string;
  responseVerbosity: string;
  responseFormality: string;
  responseCustomInstructions: string;
}

const TONE_OPTIONS = [
  { value: "professional", label: "Professional", desc: "Clear, business-appropriate" },
  { value: "casual", label: "Casual", desc: "Relaxed, everyday style" },
  { value: "friendly", label: "Friendly", desc: "Warm and encouraging" },
  { value: "direct", label: "Direct", desc: "Straight to the point" },
  { value: "empathetic", label: "Empathetic", desc: "Understanding, supportive" },
];

const VERBOSITY_OPTIONS = [
  { value: "concise", label: "Concise", desc: "Short, punchy responses" },
  { value: "balanced", label: "Balanced", desc: "Enough detail to be useful" },
  { value: "detailed", label: "Detailed", desc: "Thorough with examples" },
];

const FORMALITY_OPTIONS = [
  { value: "formal", label: "Formal", desc: "Corporate, structured" },
  { value: "conversational", label: "Conversational", desc: "Like a colleague" },
  { value: "casual", label: "Casual", desc: "Informal, relaxed" },
];

const EMPTY_FORM: AgentFormData = {
  name: "",
  role: "",
  description: "",
  systemPrompt: "",
  expertise: "",
  personality: "",
  avatarId: "option-2",
  voiceEnabled: true,
  accentColor: "#6366f1",
  responseTone: "professional",
  responseVerbosity: "balanced",
  responseFormality: "conversational",
  responseCustomInstructions: "",
};

export default function AgentLibrary() {
  const [, setLocation] = useLocation();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAgent, setEditingAgent] = useState<number | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<{ id: number; name: string } | null>(null);
  const [form, setForm] = useState<AgentFormData>({ ...EMPTY_FORM });

  const utils = trpc.useUtils();
  const { data: agents = [], isLoading } = trpc.agents.list.useQuery();

  const createMutation = trpc.agents.create.useMutation({
    onSuccess: () => {
      utils.agents.list.invalidate();
      setShowCreateDialog(false);
      setForm({ ...EMPTY_FORM });
      toast.success("Agent created", { description: `${form.name} is ready to assist you.` });
    },
    onError: (err: { message: string }) => toast.error("Failed to create agent", { description: err.message }),
  });

  const updateMutation = trpc.agents.update.useMutation({
    onSuccess: () => {
      utils.agents.list.invalidate();
      setEditingAgent(null);
      setForm({ ...EMPTY_FORM });
      toast.success("Agent updated");
    },
    onError: (err: { message: string }) => toast.error("Failed to update agent", { description: err.message }),
  });

  const deleteMutation = trpc.agents.delete.useMutation({
    onSuccess: () => {
      utils.agents.list.invalidate();
      setDeletingAgent(null);
      toast.success("Agent deleted");
    },
    onError: (err: { message: string }) => toast.error("Failed to delete agent", { description: err.message }),
  });

  const handleOpenEdit = (agent: typeof agents[0]) => {
    setForm({
      name: agent.name,
      role: agent.role || "",
      description: agent.description || "",
      systemPrompt: agent.systemPrompt,
      expertise: agent.expertise || "",
      personality: agent.personality || "",
      avatarId: agent.avatarId,
      voiceEnabled: agent.voiceEnabled,
      accentColor: agent.accentColor || "#6366f1",
      responseTone: agent.responseTone || "professional",
      responseVerbosity: agent.responseVerbosity || "balanced",
      responseFormality: agent.responseFormality || "conversational",
      responseCustomInstructions: agent.responseCustomInstructions || "",
    });
    setEditingAgent(agent.id);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.systemPrompt.trim()) {
      toast.error("Name and system prompt are required");
      return;
    }
    if (editingAgent) {
      updateMutation.mutate({ id: editingAgent, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isDialogOpen = showCreateDialog || editingAgent !== null;

  return (
    <div className="space-y-6">
      <MiaGreeting
        greeting="Here's your agent library."
        subtitle="Create specialized agents for different tasks — each with their own expertise, personality, and look."
        mood="happy"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Your Agents</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {agents.length} agent{agents.length !== 1 ? "s" : ""} in your library
          </p>
        </div>
        <Button onClick={() => { setForm({ ...EMPTY_FORM }); setShowCreateDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Agent
        </Button>
      </div>

      {/* Agent Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6 h-64" />
            </Card>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">No agents yet</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              Create your first specialized agent. Give it a name, expertise area, and custom instructions to get started.
            </p>
            <Button className="mt-6" onClick={() => { setForm({ ...EMPTY_FORM }); setShowCreateDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {agents.map((agent, idx) => {
              const avatar = getAvatarById(agent.avatarId);
              const expertiseTags = agent.expertise?.split(",").map(e => e.trim()).filter(Boolean) || [];
              return (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="group hover:shadow-lg transition-all duration-300 overflow-hidden relative">
                    {/* Accent bar */}
                    <div className="h-1.5 w-full" style={{ backgroundColor: agent.accentColor || "#6366f1" }} />

                    <CardContent className="p-5">
                      {/* Header */}
                      <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                          <img
                            src={avatar.imageUrl}
                            alt={agent.name}
                            className="w-14 h-14 rounded-full object-cover ring-2 ring-border"
                          />
                          {agent.voiceEnabled && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center">
                              <Volume2 className="h-2.5 w-2.5 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground truncate">{agent.name}</h3>
                          {agent.role && (
                            <p className="text-xs text-muted-foreground truncate">{agent.role}</p>
                          )}
                        </div>
                        {!agent.isActive && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">Archived</Badge>
                        )}
                      </div>

                      {/* Description */}
                      {agent.description && (
                        <p className="text-sm text-muted-foreground mt-3 line-clamp-2 leading-relaxed">
                          {agent.description}
                        </p>
                      )}

                      {/* Expertise tags */}
                      {expertiseTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {expertiseTags.slice(0, 4).map(tag => (
                            <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0">
                              {tag}
                            </Badge>
                          ))}
                          {expertiseTags.length > 4 && (
                            <Badge variant="outline" className="text-[10px] px-2 py-0">
                              +{expertiseTags.length - 4}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Personality */}
                      {agent.personality && (
                        <p className="text-[11px] text-muted-foreground/70 mt-2 italic truncate">
                          <Sparkles className="h-3 w-3 inline mr-1" />
                          {agent.personality}
                        </p>
                      )}

                      <Separator className="my-3" />

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => setLocation(`/agents/${agent.id}/chat`)}
                        >
                          <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                          Chat
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(agent)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingAgent({ id: agent.id, name: agent.name })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) { setShowCreateDialog(false); setEditingAgent(null); setForm({ ...EMPTY_FORM }); }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingAgent ? "Edit Agent" : "Create New Agent"}</DialogTitle>
            <DialogDescription>
              {editingAgent
                ? "Update your agent's configuration, persona, and appearance."
                : "Design a specialized agent with its own expertise, personality, and look."}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-6 pb-4">
              {/* Identity Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Bot className="h-4 w-4" /> Identity
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g., SLA Guardian"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      />
                      <VoiceButton size="sm" onTranscript={(text: string) => setForm(f => ({ ...f, name: text }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Role / Title</Label>
                    <Input
                      placeholder="e.g., SLA Compliance Specialist"
                      value={form.role}
                      onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="What does this agent do? A short summary for the library card."
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={2}
                  />
                </div>
              </div>

              <Separator />

              {/* Brain Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Brain
                </h4>
                <div className="space-y-2">
                  <Label>System Prompt *</Label>
                  <p className="text-[11px] text-muted-foreground">
                    The core instructions that define how this agent thinks and responds. Be specific about its expertise, tone, and approach.
                  </p>
                  <div className="relative">
                    <Textarea
                      placeholder="You are an expert in SLA compliance monitoring for content moderation operations. You analyze vendor performance data against contractual SLA targets and provide actionable recommendations..."
                      value={form.systemPrompt}
                      onChange={e => setForm(f => ({ ...f, systemPrompt: e.target.value }))}
                      rows={6}
                      className="pr-12"
                    />
                    <div className="absolute top-2 right-2">
                      <VoiceButton size="sm" onTranscript={(text: string) => setForm(f => ({ ...f, systemPrompt: f.systemPrompt + (f.systemPrompt ? " " : "") + text }))} />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Expertise Areas</Label>
                    <Input
                      placeholder="SLA monitoring, vendor management, data analysis"
                      value={form.expertise}
                      onChange={e => setForm(f => ({ ...f, expertise: e.target.value }))}
                    />
                    <p className="text-[10px] text-muted-foreground">Comma-separated tags</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Personality Traits</Label>
                    <Input
                      placeholder="analytical, direct, supportive"
                      value={form.personality}
                      onChange={e => setForm(f => ({ ...f, personality: e.target.value }))}
                    />
                    <p className="text-[10px] text-muted-foreground">Comma-separated traits</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Appearance Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground">Appearance</h4>

                {/* Avatar selection */}
                <div className="space-y-2">
                  <Label>Avatar</Label>
                  <div className="grid grid-cols-6 gap-3">
                    {AVATAR_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setForm(f => ({ ...f, avatarId: opt.id }))}
                        className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                          form.avatarId === opt.id
                            ? "border-primary ring-2 ring-primary/20 scale-105"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <img src={opt.imageUrl} alt={opt.name} className="w-full aspect-square object-cover" />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-1">
                          <p className="text-[9px] text-white text-center font-medium">{opt.name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent colour */}
                <div className="space-y-2">
                  <Label>Accent Colour</Label>
                  <div className="flex gap-2 flex-wrap">
                    {ACCENT_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setForm(f => ({ ...f, accentColor: color }))}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          form.accentColor === color ? "border-foreground scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Voice toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Voice Enabled</Label>
                    <p className="text-[11px] text-muted-foreground">Agent speaks responses aloud using text-to-speech</p>
                  </div>
                  <Switch
                    checked={form.voiceEnabled}
                    onCheckedChange={v => setForm(f => ({ ...f, voiceEnabled: v }))}
                  />
                </div>
              </div>

              <Separator />

              {/* Response Style Section */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Response Style
                </h4>

                {/* Tone */}
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {TONE_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => setForm(f => ({ ...f, responseTone: opt.value }))}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          form.responseTone === opt.value
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                            : "border-border/60 hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-medium ${form.responseTone === opt.value ? "text-primary" : "text-foreground"}`}>
                            {opt.label}
                          </span>
                          {form.responseTone === opt.value && <Check className="h-3 w-3 text-primary" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Verbosity & Formality */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Verbosity</Label>
                    <Select
                      value={form.responseVerbosity}
                      onValueChange={val => setForm(f => ({ ...f, responseVerbosity: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VERBOSITY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label} — {opt.desc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Formality</Label>
                    <Select
                      value={form.responseFormality}
                      onValueChange={val => setForm(f => ({ ...f, responseFormality: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMALITY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label} — {opt.desc}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Custom Instructions */}
                <div className="space-y-2">
                  <Label>Custom Instructions</Label>
                  <p className="text-[10px] text-muted-foreground">Specific rules for how this agent should respond</p>
                  <Textarea
                    placeholder='e.g., "Always provide data-backed recommendations", "Start with a one-line summary"'
                    value={form.responseCustomInstructions}
                    onChange={e => setForm(f => ({ ...f, responseCustomInstructions: e.target.value }))}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); setEditingAgent(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving..." : editingAgent ? "Save Changes" : "Create Agent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingAgent} onOpenChange={(open) => { if (!open) setDeletingAgent(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deletingAgent?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this agent and all its conversation history. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingAgent && deleteMutation.mutate({ id: deletingAgent.id })}
            >
              Delete Agent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
