import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MiaGreeting, MiaMessage, MiaAvatar } from "@/components/Mia";
import { Mail, Sparkles, Loader2, Trash2, Eye, Copy } from "lucide-react";
import { VoiceInputButton } from "@/components/VoiceButton";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Communications() {
  const { user } = useAuth();
  const [draftOpen, setDraftOpen] = useState(false);
  const [viewComm, setViewComm] = useState<any>(null);
  const comms = trpc.communications.list.useQuery();
  const utils = trpc.useUtils();

  const draftComm = trpc.ai.draftCommunication.useMutation({ onError: (err) => toast.error(err.message) });
  const createComm = trpc.communications.create.useMutation({ onSuccess: () => utils.communications.list.invalidate() });
  const deleteComm = trpc.communications.delete.useMutation({ onSuccess: () => { utils.communications.list.invalidate(); toast.success("Deleted"); } });

  const [form, setForm] = useState({ commType: "status_update" as const, subject: "", context: "", tone: "professional", recipients: "" });

  const handleDraft = async () => {
    if (!form.subject.trim()) { toast.error("Subject is required"); return; }
    const result = await draftComm.mutateAsync(form);
    const content = typeof result.content === "string" ? result.content : "";
    await createComm.mutateAsync({ commType: form.commType, subject: form.subject, content, recipients: form.recipients });
    setDraftOpen(false);
    setForm({ commType: "status_update", subject: "", context: "", tone: "professional", recipients: "" });
    toast.success("Communication drafted and saved");
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied to clipboard"); };

  const commTypeLabels: Record<string, string> = {
    escalation: "Escalation", status_update: "Status Update", stakeholder_email: "Stakeholder Email",
    vendor_comm: "Vendor Comm", program_update: "Program Update", other: "Other",
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-primary/5 via-card to-chart-4/5 rounded-2xl border border-border/40 p-6">
        <MiaGreeting userName={user?.name || undefined} greeting="Communication Drafter" subtitle="Tell me what you need to communicate and I'll draft it for you — escalations, status updates, stakeholder emails, or vendor communications." mood="speaking" />
      </motion.div>

      <div className="flex items-center justify-end">
        <Dialog open={draftOpen} onOpenChange={setDraftOpen}>
          <DialogTrigger asChild><Button><Sparkles className="mr-2 h-4 w-4" />Ask Mia to Draft</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><MiaAvatar mood="speaking" size="sm" showGlow={false} />Draft Communication</DialogTitle>
              <DialogDescription>I'll write a professional communication based on your inputs.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.commType} onValueChange={v => setForm(p => ({ ...p, commType: v as any }))}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="escalation">Escalation</SelectItem>
                      <SelectItem value="status_update">Status Update</SelectItem>
                      <SelectItem value="stakeholder_email">Stakeholder Email</SelectItem>
                      <SelectItem value="vendor_comm">Vendor Communication</SelectItem>
                      <SelectItem value="program_update">Program Update</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={form.tone} onValueChange={v => setForm(p => ({ ...p, tone: v }))}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="formal">Formal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="concise">Concise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Subject *</Label><div className="flex gap-2"><Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Weekly vendor performance update" className="flex-1" /><VoiceInputButton onTranscript={t => setForm(p => ({ ...p, subject: p.subject ? p.subject + " " + t : t }))} /></div></div>
              <div className="space-y-2"><Label>Recipients</Label><Input value={form.recipients} onChange={e => setForm(p => ({ ...p, recipients: e.target.value }))} placeholder="Names or teams" /></div>
              <div className="space-y-2"><Label>Context & Key Points</Label><div className="flex gap-2 items-start"><Textarea value={form.context} onChange={e => setForm(p => ({ ...p, context: e.target.value }))} rows={4} placeholder="What should the communication cover?" className="flex-1" /><VoiceInputButton onTranscript={t => setForm(p => ({ ...p, context: p.context ? p.context + " " + t : t }))} className="mt-1" /></div></div>
              <Button onClick={handleDraft} disabled={draftComm.isPending} className="w-full">
                {draftComm.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mia is drafting...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Draft</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!viewComm} onOpenChange={() => setViewComm(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewComm?.subject}</DialogTitle></DialogHeader>
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary" className="text-xs">{commTypeLabels[viewComm?.commType] || viewComm?.commType}</Badge>
            {viewComm?.recipients && <span className="text-xs text-muted-foreground">To: {viewComm.recipients}</span>}
          </div>
          <MiaMessage content={viewComm?.content || ""} mood="speaking" avatarSize="sm" />
          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(viewComm?.content || "")}><Copy className="mr-2 h-4 w-4" />Copy to Clipboard</Button>
          </div>
        </DialogContent>
      </Dialog>

      {comms.isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : !comms.data?.length ? (
        <Card className="border-dashed border-border/40">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MiaAvatar mood="neutral" size="lg" />
            <p className="text-sm text-muted-foreground mt-4">No communications yet. Tell me what you need to say.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {comms.data.map((comm, i) => (
            <motion.div key={comm.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/40 hover:shadow-sm transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary shrink-0" /><h3 className="text-sm font-medium truncate">{comm.subject}</h3></div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">{commTypeLabels[comm.commType] || comm.commType}</Badge>
                        <Badge variant="outline" className="text-[10px]">{comm.status}</Badge>
                        {comm.recipients && <span className="text-[11px] text-muted-foreground">To: {comm.recipients}</span>}
                        <span className="text-[11px] text-muted-foreground">{new Date(comm.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewComm(comm)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteComm.mutate({ id: comm.id })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
