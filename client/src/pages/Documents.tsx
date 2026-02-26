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
import { FileEdit, Sparkles, Loader2, Trash2, Eye, Copy, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function Documents() {
  const [generateOpen, setGenerateOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<any>(null);
  const [search, setSearch] = useState("");
  const docs = trpc.documents.list.useQuery();
  const utils = trpc.useUtils();

  const generateDoc = trpc.ai.generateDocument.useMutation({
    onError: (err: any) => toast.error(err.message),
  });

  const createDoc = trpc.documents.create.useMutation({
    onSuccess: () => utils.documents.list.invalidate(),
  });

  const deleteDoc = trpc.documents.delete.useMutation({
    onSuccess: () => { utils.documents.list.invalidate(); toast.success("Document deleted"); },
  });

  const [form, setForm] = useState({
    docType: "sop" as const, title: "", context: "", outline: "",
  });

  const handleGenerate = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    const result = await generateDoc.mutateAsync(form);
    const content = typeof result.content === "string" ? result.content : "";
    await createDoc.mutateAsync({
      title: form.title,
      docType: form.docType,
      content,
    });
    setGenerateOpen(false);
    setForm({ docType: "sop", title: "", context: "", outline: "" });
    toast.success("Document generated and saved");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const docTypeLabels: Record<string, string> = {
    sop: "SOP", training: "Training Material", process_doc: "Process Doc",
    policy: "Policy", runbook: "Runbook", other: "Other",
  };

  const filtered = docs.data?.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.docType.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-generated SOPs, training materials, and process documentation.</p>
        </div>
        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogTrigger asChild>
            <Button><Sparkles className="mr-2 h-4 w-4" />Generate Document</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Generate Document</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select value={form.docType} onValueChange={v => setForm(p => ({ ...p, docType: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sop">Standard Operating Procedure</SelectItem>
                    <SelectItem value="training">Training Material</SelectItem>
                    <SelectItem value="process_doc">Process Documentation</SelectItem>
                    <SelectItem value="policy">Policy Document</SelectItem>
                    <SelectItem value="runbook">Runbook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Content Moderation Quality Review Process" /></div>
              <div className="space-y-2"><Label>Context & Requirements</Label><Textarea value={form.context} onChange={e => setForm(p => ({ ...p, context: e.target.value }))} rows={3} placeholder="Describe the purpose, audience, and key topics..." /></div>
              <div className="space-y-2"><Label>Outline (optional)</Label><Textarea value={form.outline} onChange={e => setForm(p => ({ ...p, outline: e.target.value }))} rows={3} placeholder="Optional: provide a section outline..." /></div>
              <Button onClick={handleGenerate} disabled={generateDoc.isPending} className="w-full">
                {generateDoc.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Document</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search documents..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* View Document Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewDoc?.title}</DialogTitle></DialogHeader>
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="secondary">{docTypeLabels[viewDoc?.docType] || viewDoc?.docType}</Badge>
            <span className="text-xs text-muted-foreground">{viewDoc?.createdAt && new Date(viewDoc.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Streamdown>{viewDoc?.content || ""}</Streamdown>
          </div>
          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(viewDoc?.content || "")}>
              <Copy className="mr-2 h-4 w-4" />Copy to Clipboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {docs.isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : !filtered.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileEdit className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">{search ? "No documents match your search" : "No documents yet. Generate your first one."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(doc => (
            <Card key={doc.id} className="border-border/50 hover:shadow-sm transition-all">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <FileEdit className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="text-sm font-medium truncate">{doc.title}</h3>
                    </div>
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
          ))}
        </div>
      )}
    </div>
  );
}
