import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { MiaGreeting, MiaMessage, MiaAvatar } from "@/components/Mia";
import { Award, Sparkles, Loader2, Trash2, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Scorecards() {
  const { user } = useAuth();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [viewCard, setViewCard] = useState<any>(null);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [period, setPeriod] = useState("monthly");
  const scorecards = trpc.scorecards.list.useQuery();
  const vendors = trpc.vendors.list.useQuery();
  const utils = trpc.useUtils();

  const generateScorecard = trpc.ai.generateScorecard.useMutation({ onError: (err) => toast.error(err.message) });
  const createScorecard = trpc.scorecards.create.useMutation({ onSuccess: () => utils.scorecards.list.invalidate() });
  const deleteScorecard = trpc.scorecards.delete.useMutation({ onSuccess: () => { utils.scorecards.list.invalidate(); toast.success("Deleted"); } });

  const handleGenerate = async () => {
    if (!selectedVendor) { toast.error("Select a vendor"); return; }
    const vendorId = parseInt(selectedVendor);
    const vendor = vendors.data?.find(v => v.id === vendorId);
    const result = await generateScorecard.mutateAsync({ vendorId, period });
    const commentary = typeof result.commentary === "string" ? result.commentary : "";
    await createScorecard.mutateAsync({
      vendorId, period, overallScore: result.overallScore, accuracyScore: result.accuracyScore,
      throughputScore: result.throughputScore, qualityScore: result.qualityScore, commentary,
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

  const getVendorName = (vendorId: number) => vendors.data?.find(v => v.id === vendorId)?.name || `Vendor #${vendorId}`;

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-primary/5 via-card to-chart-2/5 rounded-2xl border border-border/40 p-6">
        <MiaGreeting userName={user?.name || undefined} greeting="Vendor Scorecards" subtitle="Select a vendor and I'll generate a comprehensive performance scorecard with scores and commentary based on their latest metrics." mood="speaking" />
      </motion.div>

      <div className="flex items-center justify-end">
        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogTrigger asChild><Button><Sparkles className="mr-2 h-4 w-4" />Ask Mia to Score</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><MiaAvatar mood="thinking" size="sm" showGlow={false} />Generate Scorecard</DialogTitle>
              <DialogDescription>I'll analyze the vendor's metrics and produce a scored assessment.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Vendor *</Label>
                <Select value={selectedVendor} onValueChange={setSelectedVendor}><SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>{vendors.data?.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Period</Label>
                <Select value={period} onValueChange={setPeriod}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleGenerate} disabled={generateScorecard.isPending} className="w-full">
                {generateScorecard.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mia is scoring...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Scorecard</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!viewCard} onOpenChange={() => setViewCard(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewCard ? getVendorName(viewCard.vendorId) : ""} Scorecard</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <Card className="border-border/40"><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Overall</p><p className={`text-2xl font-bold ${getScoreColor(viewCard?.overallScore)}`}>{viewCard?.overallScore ?? "—"}</p></CardContent></Card>
              <Card className="border-border/40"><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Accuracy</p><p className={`text-2xl font-bold ${getScoreColor(viewCard?.accuracyScore)}`}>{viewCard?.accuracyScore ?? "—"}</p></CardContent></Card>
              <Card className="border-border/40"><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Throughput</p><p className={`text-2xl font-bold ${getScoreColor(viewCard?.throughputScore)}`}>{viewCard?.throughputScore ?? "—"}</p></CardContent></Card>
              <Card className="border-border/40"><CardContent className="p-3 text-center"><p className="text-[10px] text-muted-foreground uppercase">Quality</p><p className={`text-2xl font-bold ${getScoreColor(viewCard?.qualityScore)}`}>{viewCard?.qualityScore ?? "—"}</p></CardContent></Card>
            </div>
            {viewCard?.commentary && (
              <div><h3 className="text-sm font-semibold mb-2">Mia's Assessment</h3><MiaMessage content={viewCard.commentary} mood="speaking" avatarSize="sm" /></div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {scorecards.isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : !scorecards.data?.length ? (
        <Card className="border-dashed border-border/40">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MiaAvatar mood="neutral" size="lg" />
            <p className="text-sm text-muted-foreground mt-4">No scorecards yet. Let me evaluate your vendors.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {scorecards.data.map((sc, i) => (
            <motion.div key={sc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/40 hover:shadow-sm transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0"><h3 className="text-sm font-medium truncate">{getVendorName(sc.vendorId)}</h3>
                      <div className="flex items-center gap-2 mt-1"><Badge variant="secondary" className="text-[10px]">{sc.period}</Badge><span className="text-[11px] text-muted-foreground">{new Date(sc.createdAt).toLocaleDateString()}</span></div>
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
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
