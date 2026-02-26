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
import { VoiceInputButton } from "@/components/VoiceButton";
import { MiaGreeting, MiaMessage, MiaAvatar } from "@/components/Mia";
import { FileEdit, Sparkles, Loader2, Trash2, Eye, Copy, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Documents() {
  const { user } = useAuth();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<any>(null);
  const [search, setSearch] = useState("");
  const docs = trpc.documents.list.useQuery();
  const utils = trpc.useUtils();

  const generateDoc = trpc.ai.generateDocument.useMutation({ onError: (err) => toast.error(err.message) });
  const createDoc = trpc.documents.create.useMutation({ onSuccess: () => utils.documents.list.invalidate() });
  const deleteDoc = trpc.documents.delete.useMutation({ onSuccess: () => { utils.documents.list.invalidate(); toast.success("Deleted"); } });

  const [form, setForm] = useState({ docType: "sop" as const, title: "", context: "", outline: "" });

  const handleGenerate = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    const result = await generateDoc.mutateAsync(form);
    const content = typeof result.content === "string" ? result.content : "";
    await createDoc.mutateAsync({ title: form.title, docType: form.docType, content });
    setGenerateOpen(false);
    setForm({ docType: "sop", title: "", context: "", outline: "" });
    toast.success("Document generated and saved");
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied to clipboard"); };

  const docTypeLabels: Record<string, string> = { sop: "SOP", training: "Training Material", process: "Process Doc", policy: "Policy", template: "Template", other: "Other" };

  const filtered = docs.data?.filter(d => d.title.toLowerCase().includes(search.toLowerCase()) || d.docType.toLowerCase().includes(search.toLowerCase())) ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-primary/5 via-card to-chart-3/5 rounded-2xl border border-border/40 p-6">
        <MiaGreeting userName={user?.name || undefined} greeting="Document Generator" subtitle="Tell me what document you need — SOPs, training materials, process docs, or policies — and I'll write a comprehensive first draft for you." mood="speaking" />
      </motion.div>

      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogTrigger asChild><Button><Sparkles className="mr-2 h-4 w-4" />Ask Mia to Write</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><MiaAvatar mood="speaking" size="sm" showGlow={false} />Generate Document</DialogTitle>
              <DialogDescription>I'll create a well-structured document based on your specifications.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={form.docType} onValueChange={v => setForm(p => ({ ...p, docType: v as any }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sop">Standard Operating Procedure</SelectItem>
                    <SelectItem value="training">Training Material</SelectItem>
                    <SelectItem value="process">Process Documentation</SelectItem>
                    <SelectItem value="policy">Policy Document</SelectItem>
                    <SelectItem value="template">Template</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Content Moderation Quality Review Process" /></div>
              <div className="space-y-2"><Label>Context & Requirements</Label><div className="flex gap-2 items-start"><Textarea value={form.context} onChange={e => setForm(p => ({ ...p, context: e.target.value }))} rows={3} placeholder="Describe the purpose, audience, and key topics..." className="flex-1" /><VoiceInputButton onTranscript={t => setForm(p => ({ ...p, context: p.context ? p.context + " " + t : t }))} className="mt-1" /></div></div>
              <div className="space-y-2"><Label>Outline (optional)</Label><div className="flex gap-2 items-start"><Textarea value={form.outline} onChange={e => setForm(p => ({ ...p, outline: e.target.value }))} rows={3} placeholder="Optional: provide a section outline..." className="flex-1" /><VoiceInputButton onTranscript={t => setForm(p => ({ ...p, outline: p.outline ? p.outline + " " + t : t }))} className="mt-1" /></div></div>
              <Button onClick={handleGenerate} disabled={generateDoc.isPending} className="w-full">
                {generateDoc.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mia is writing...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Document</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewDoc?.title}</DialogTitle></DialogHeader>
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary">{docTypeLabels[viewDoc?.docType] || viewDoc?.docType}</Badge>
            <span className="text-xs text-muted-foreground">{viewDoc?.createdAt && new Date(viewDoc.createdAt).toLocaleDateString()}</span>
          </div>
          <MiaMessage content={viewDoc?.content || ""} mood="speaking" avatarSize="sm" />
          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(viewDoc?.content || "")}><Copy className="mr-2 h-4 w-4" />Copy to Clipboard</Button>
          </div>
        </DialogContent>
      </Dialog>

      {docs.isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : !filtered.length ? (
        <Card className="border-dashed border-border/40">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MiaAvatar mood="neutral" size="lg" />
            <p className="text-sm text-muted-foreground mt-4">{search ? "No documents match your search." : "No documents yet. Tell me what you need written."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc, i) => (
            <motion.div key={doc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/40 hover:shadow-sm transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><FileEdit className="h-4 w-4 text-primary shrink-0" /><h3 className="text-sm font-medium truncate">{doc.title}</h3></div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-[10px]">{docTypeLabels[doc.docType] || doc.docType}</Badge>
                        <Badge variant="outline" className="text-[10px]">{doc.status}</Badge>
                        <span className="text-[11px] text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewDoc(doc)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteDoc.mutate({ id: doc.id })}><Trash2 className="h-4 w-4" /></Button>
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
