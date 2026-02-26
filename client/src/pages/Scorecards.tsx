import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Award, Sparkles, Loader2, Trash2, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function Scorecards() {
  const [generateOpen, setGenerateOpen] = useState(false);
  const [viewCard, setViewCard] = useState<any>(null);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [period, setPeriod] = useState("monthly");
  const scorecards = trpc.scorecards.list.useQuery();
  const vendors = trpc.vendors.list.useQuery();
  const utils = trpc.useUtils();

  const generateScorecard = trpc.ai.generateScorecard.useMutation({
    onError: (err: any) => toast.error(err.message),
  });

  const createScorecard = trpc.scorecards.create.useMutation({
    onSuccess: () => utils.scorecards.list.invalidate(),
  });

  const deleteScorecard = trpc.scorecards.delete.useMutation({
    onSuccess: () => { utils.scorecards.list.invalidate(); toast.success("Scorecard deleted"); },
  });

  const handleGenerate = async () => {
    if (!selectedVendor) { toast.error("Select a vendor"); return; }
    const vendorId = parseInt(selectedVendor);
    const vendor = vendors.data?.find(v => v.id === vendorId);
    const result = await generateScorecard.mutateAsync({ vendorId, period });
    const content = typeof result.content === "string" ? result.content : "";
    await createScorecard.mutateAsync({
      vendorId,
      period,
      overallScore: result.overallScore,
      accuracyScore: result.accuracyScore,
      throughputScore: result.throughputScore,
      qualityScore: result.qualityScore,
      commentary: content,
    });
    setGenerateOpen(false);
    toast.success(`Scorecard generated for ${vendor?.name}`);
  };

  const getScoreColor = (score: number | null) => {
    if (!score) return "text-muted-foreground";
    if (score >= 90) return "text-green-500";
    if (score >= 75) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendor Scorecards</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-generated performance scorecards with commentary.</p>
        </div>
        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogTrigger asChild>
            <Button><Sparkles className="mr-2 h-4 w-4" />Generate Scorecard</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Generate Vendor Scorecard</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Vendor *</Label>
                <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendors.data?.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Period</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">The scorecard will be generated from the vendor's latest performance metrics.</p>
              <Button onClick={handleGenerate} disabled={generateScorecard.isPending} className="w-full">
                {generateScorecard.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Scorecard</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* View Scorecard Dialog */}
      <Dialog open={!!viewCard} onOpenChange={() => setViewCard(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Vendor Scorecard</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <Card className="border-border/50"><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Overall</p><p className={`text-2xl font-bold ${getScoreColor(viewCard?.overallScore)}`}>{viewCard?.overallScore ?? "—"}</p></CardContent></Card>
              <Card className="border-border/50"><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Accuracy</p><p className={`text-2xl font-bold ${getScoreColor(viewCard?.accuracyScore)}`}>{viewCard?.accuracyScore ?? "—"}</p></CardContent></Card>
              <Card className="border-border/50"><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Throughput</p><p className={`text-2xl font-bold ${getScoreColor(viewCard?.throughputScore)}`}>{viewCard?.throughputScore ?? "—"}</p></CardContent></Card>
              <Card className="border-border/50"><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Quality</p><p className={`text-2xl font-bold ${getScoreColor(viewCard?.qualityScore)}`}>{viewCard?.qualityScore ?? "—"}</p></CardContent></Card>
            </div>
            {viewCard?.commentary && (
              <div><h3 className="text-sm font-semibold mb-2">Commentary</h3><div className="prose prose-sm dark:prose-invert max-w-none bg-muted/50 rounded-lg p-4"><Streamdown>{viewCard.commentary}</Streamdown></div></div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {scorecards.isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : !scorecards.data?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No scorecards yet. Generate your first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scorecards.data.map(sc => (
            <Card key={sc.id} className="border-border/50 hover:shadow-sm transition-all">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium truncate">Vendor #{sc.vendorId}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">{sc.period}</Badge>
                      <span className="text-[11px] text-muted-foreground">{new Date(sc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewCard(sc)}><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteScorecard.mutate({ id: sc.id })}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-3 border-t">
                  <div className="text-center"><p className="text-[10px] text-muted-foreground">Overall</p><p className={`text-lg font-bold ${getScoreColor(sc.overallScore)}`}>{sc.overallScore ?? "—"}</p></div>
                  <div className="text-center"><p className="text-[10px] text-muted-foreground">Accuracy</p><p className={`text-lg font-bold ${getScoreColor(sc.accuracyScore)}`}>{sc.accuracyScore ?? "—"}</p></div>
                  <div className="text-center"><p className="text-[10px] text-muted-foreground">Throughput</p><p className={`text-lg font-bold ${getScoreColor(sc.throughputScore)}`}>{sc.throughputScore ?? "—"}</p></div>
                  <div className="text-center"><p className="text-[10px] text-muted-foreground">Quality</p><p className={`text-lg font-bold ${getScoreColor(sc.qualityScore)}`}>{sc.qualityScore ?? "—"}</p></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
