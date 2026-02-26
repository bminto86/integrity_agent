import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Sparkles, Loader2, Trash2, Eye, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function Communications() {
  const [draftOpen, setDraftOpen] = useState(false);
  const [viewComm, setViewComm] = useState<any>(null);
  const comms = trpc.communications.list.useQuery();
  const utils = trpc.useUtils();

  const draftComm = trpc.ai.draftCommunication.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const createComm = trpc.communications.create.useMutation({
    onSuccess: () => { utils.communications.list.invalidate(); },
  });

  const deleteComm = trpc.communications.delete.useMutation({
    onSuccess: () => { utils.communications.list.invalidate(); toast.success("Communication deleted"); },
  });

  const [form, setForm] = useState({
    commType: "status_update" as const, subject: "", context: "",
    tone: "professional", recipients: "",
  });

  const handleDraft = async () => {
    if (!form.subject.trim()) { toast.error("Subject is required"); return; }
    const result = await draftComm.mutateAsync(form);
    const content = typeof result.content === "string" ? result.content : "";
    await createComm.mutateAsync({
      commType: form.commType,
      subject: form.subject,
      content,
      recipients: form.recipients,
    });
    setDraftOpen(false);
    setForm({ commType: "status_update", subject: "", context: "", tone: "professional", recipients: "" });
    toast.success("Communication drafted and saved");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const commTypeLabels: Record<string, string> = {
    escalation: "Escalation", status_update: "Status Update", stakeholder_email: "Stakeholder Email",
    vendor_comm: "Vendor Comm", program_update: "Program Update", other: "Other",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Comm Drafter</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-assisted communication drafting for stakeholders and vendors.</p>
        </div>
        <Dialog open={draftOpen} onOpenChange={setDraftOpen}>
          <DialogTrigger asChild>
            <Button><Sparkles className="mr-2 h-4 w-4" />Draft Communication</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>AI Communication Drafter</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.commType} onValueChange={v => setForm(p => ({ ...p, commType: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <Select value={form.tone} onValueChange={v => setForm(p => ({ ...p, tone: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
              <div className="space-y-2"><Label>Subject *</Label><Input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Weekly vendor performance update" /></div>
              <div className="space-y-2"><Label>Recipients</Label><Input value={form.recipients} onChange={e => setForm(p => ({ ...p, recipients: e.target.value }))} placeholder="Names or teams" /></div>
              <div className="space-y-2"><Label>Context & Key Points</Label><Textarea value={form.context} onChange={e => setForm(p => ({ ...p, context: e.target.value }))} rows={4} placeholder="What should the communication cover? Any specific data points or actions needed..." /></div>
              <Button onClick={handleDraft} disabled={draftComm.isPending} className="w-full">
                {draftComm.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Drafting...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Draft</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* View Communication Dialog */}
      <Dialog open={!!viewComm} onOpenChange={() => setViewComm(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{viewComm?.subject}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary" className="text-xs">{commTypeLabels[viewComm?.commType] || viewComm?.commType}</Badge>
            {viewComm?.recipients && <span className="text-xs text-muted-foreground">To: {viewComm.recipients}</span>}
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Streamdown>{viewComm?.content || ""}</Streamdown>
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(viewComm?.content || "")}>
              <Copy className="mr-2 h-4 w-4" />Copy to Clipboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {comms.isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : !comms.data?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No communications yet. Draft your first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {comms.data.map(comm => (
            <Card key={comm.id} className="border-border/50 hover:shadow-sm transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="text-sm font-medium truncate">{comm.subject}</h3>
                    </div>
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
          ))}
        </div>
      )}
    </div>
  );
}
