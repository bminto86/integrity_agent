import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInputButton } from "@/components/VoiceButton";
import { MiaGreeting, MiaMessage, MiaAvatar } from "@/components/Mia";
import { Calculator, Sparkles, Loader2, Trash2, Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { motion } from "framer-motion";

export default function Workforce() {
  const { user } = useAuth();
  const [forecastOpen, setForecastOpen] = useState(false);
  const [viewPlan, setViewPlan] = useState<any>(null);
  const plans = trpc.workforce.list.useQuery();
  const vendors = trpc.vendors.list.useQuery();
  const utils = trpc.useUtils();

  const forecast = trpc.ai.workforceForecast.useMutation({ onError: (err) => toast.error(err.message) });
  const createPlan = trpc.workforce.create.useMutation({ onSuccess: () => utils.workforce.list.invalidate() });
  const deletePlan = trpc.workforce.delete.useMutation({ onSuccess: () => { utils.workforce.list.invalidate(); toast.success("Plan deleted"); } });

  const [form, setForm] = useState({
    vendorId: undefined as number | undefined,
    currentVolume: 10000, currentHeadcount: 50, growthRate: 10, context: "",
  });

  const handleForecast = async () => {
    const result = await forecast.mutateAsync(form);
    const vendor = vendors.data?.find(v => v.id === form.vendorId);
    await createPlan.mutateAsync({
      title: `Forecast - ${vendor?.name || "All Vendors"} - ${new Date().toLocaleDateString()}`,
      vendorId: form.vendorId, forecastPeriod: "Next Quarter",
      projectedVolume: result.projectedVolume, recommendedHeadcount: result.recommendedHeadcount,
      currentHeadcount: form.currentHeadcount, assumptions: result.assumptions, recommendations: result.recommendations,
    });
    setForecastOpen(false);
    toast.success("Workforce forecast generated and saved");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-primary/5 via-card to-chart-5/5 rounded-2xl border border-border/40 p-6">
        <MiaGreeting userName={user?.name || undefined} greeting="Workforce Planner" subtitle="Give me your current volume and headcount, and I'll forecast staffing needs based on growth projections and historical patterns." mood="speaking" />
      </motion.div>

      <div className="flex items-center justify-end">
        <Dialog open={forecastOpen} onOpenChange={setForecastOpen}>
          <DialogTrigger asChild><Button><Sparkles className="mr-2 h-4 w-4" />Ask Mia to Forecast</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><MiaAvatar mood="thinking" size="sm" showGlow={false} />Workforce Forecast</DialogTitle>
              <DialogDescription>I'll analyze your data and recommend optimal staffing levels.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Vendor (optional)</Label>
                <Select value={form.vendorId?.toString() || "all"} onValueChange={v => setForm(p => ({ ...p, vendorId: v === "all" ? undefined : parseInt(v) }))}><SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {vendors.data?.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Current Volume</Label><Input type="number" value={form.currentVolume} onChange={e => setForm(p => ({ ...p, currentVolume: parseInt(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><Label>Headcount</Label><Input type="number" value={form.currentHeadcount} onChange={e => setForm(p => ({ ...p, currentHeadcount: parseInt(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><Label>Growth (%)</Label><Input type="number" value={form.growthRate} onChange={e => setForm(p => ({ ...p, growthRate: parseFloat(e.target.value) || 0 }))} /></div>
              </div>
              <div className="space-y-2"><Label>Additional Context</Label><div className="flex gap-2 items-start"><Textarea value={form.context} onChange={e => setForm(p => ({ ...p, context: e.target.value }))} rows={3} placeholder="Seasonal trends, upcoming launches, policy changes..." className="flex-1" /><VoiceInputButton onTranscript={t => setForm(p => ({ ...p, context: p.context ? p.context + " " + t : t }))} className="mt-1" /></div></div>
              <Button onClick={handleForecast} disabled={forecast.isPending} className="w-full">
                {forecast.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mia is forecasting...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Forecast</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!viewPlan} onOpenChange={() => setViewPlan(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewPlan?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-border/40"><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Projected Volume</p><p className="text-xl font-bold mt-1">{viewPlan?.projectedVolume?.toLocaleString()}</p></CardContent></Card>
              <Card className="border-border/40"><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Recommended HC</p><p className="text-xl font-bold mt-1">{viewPlan?.recommendedHeadcount}</p></CardContent></Card>
              <Card className="border-border/40"><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current HC</p><p className="text-xl font-bold mt-1">{viewPlan?.currentHeadcount}</p></CardContent></Card>
            </div>
            {viewPlan?.assumptions && (
              <div><h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><MiaAvatar mood="thinking" size="sm" showGlow={false} />Assumptions</h3><MiaMessage content={viewPlan.assumptions} mood="thinking" avatarSize="sm" /></div>
            )}
            {viewPlan?.recommendations && (
              <div><h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><MiaAvatar mood="speaking" size="sm" showGlow={false} />Recommendations</h3><MiaMessage content={viewPlan.recommendations} mood="speaking" avatarSize="sm" /></div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {plans.isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : !plans.data?.length ? (
        <Card className="border-dashed border-border/40">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MiaAvatar mood="neutral" size="lg" />
            <p className="text-sm text-muted-foreground mt-4">No workforce plans yet. Let me help you forecast staffing needs.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.data.map((plan, i) => (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/40 hover:shadow-sm transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0"><h3 className="text-sm font-medium truncate">{plan.title}</h3><p className="text-[11px] text-muted-foreground mt-1">{new Date(plan.createdAt).toLocaleDateString()}</p></div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewPlan(plan)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deletePlan.mutate({ id: plan.id })}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t">
                    <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Volume</p><p className="text-sm font-semibold mt-0.5">{plan.projectedVolume?.toLocaleString() || "—"}</p></div>
                    <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rec. HC</p><p className="text-sm font-semibold mt-0.5">{plan.recommendedHeadcount || "—"}</p></div>
                    <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current HC</p><p className="text-sm font-semibold mt-0.5">{plan.currentHeadcount || "—"}</p></div>
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
