import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calculator, Sparkles, Loader2, Trash2, Eye, Users, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function Workforce() {
  const [forecastOpen, setForecastOpen] = useState(false);
  const [viewPlan, setViewPlan] = useState<any>(null);
  const plans = trpc.workforce.list.useQuery();
  const vendors = trpc.vendors.list.useQuery();
  const utils = trpc.useUtils();

  const forecast = trpc.ai.workforceForecast.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const createPlan = trpc.workforce.create.useMutation({
    onSuccess: () => utils.workforce.list.invalidate(),
  });

  const deletePlan = trpc.workforce.delete.useMutation({
    onSuccess: () => { utils.workforce.list.invalidate(); toast.success("Plan deleted"); },
  });

  const [form, setForm] = useState({
    vendorId: undefined as number | undefined,
    currentVolume: 10000, currentHeadcount: 50, growthRate: 10, context: "",
  });

  const handleForecast = async () => {
    const result = await forecast.mutateAsync(form);
    const vendor = vendors.data?.find(v => v.id === form.vendorId);
    await createPlan.mutateAsync({
      title: `Forecast - ${vendor?.name || "All Vendors"} - ${new Date().toLocaleDateString()}`,
      vendorId: form.vendorId,
      forecastPeriod: "Next Quarter",
      projectedVolume: result.projectedVolume,
      recommendedHeadcount: result.recommendedHeadcount,
      currentHeadcount: form.currentHeadcount,
      assumptions: result.assumptions,
      recommendations: result.recommendations,
    });
    setForecastOpen(false);
    toast.success("Workforce forecast generated and saved");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Workforce Planner</h1>
          <p className="text-sm text-muted-foreground mt-1">AI-powered volume forecasting and staffing recommendations.</p>
        </div>
        <Dialog open={forecastOpen} onOpenChange={setForecastOpen}>
          <DialogTrigger asChild>
            <Button><Sparkles className="mr-2 h-4 w-4" />Generate Forecast</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Workforce Forecast</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Vendor (optional)</Label>
                <Select value={form.vendorId?.toString() || "all"} onValueChange={v => setForm(p => ({ ...p, vendorId: v === "all" ? undefined : parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
              <div className="space-y-2"><Label>Additional Context</Label><Textarea value={form.context} onChange={e => setForm(p => ({ ...p, context: e.target.value }))} rows={3} placeholder="Seasonal trends, upcoming launches, policy changes..." /></div>
              <Button onClick={handleForecast} disabled={forecast.isPending} className="w-full">
                {forecast.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Forecasting...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Forecast</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* View Plan Dialog */}
      <Dialog open={!!viewPlan} onOpenChange={() => setViewPlan(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewPlan?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-border/50"><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Projected Volume</p><p className="text-xl font-bold mt-1">{viewPlan?.projectedVolume?.toLocaleString()}</p></CardContent></Card>
              <Card className="border-border/50"><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Recommended HC</p><p className="text-xl font-bold mt-1">{viewPlan?.recommendedHeadcount}</p></CardContent></Card>
              <Card className="border-border/50"><CardContent className="p-4"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current HC</p><p className="text-xl font-bold mt-1">{viewPlan?.currentHeadcount}</p></CardContent></Card>
            </div>
            {viewPlan?.assumptions && (
              <div><h3 className="text-sm font-semibold mb-2">Assumptions</h3><div className="prose prose-sm dark:prose-invert max-w-none bg-muted/50 rounded-lg p-4"><Streamdown>{viewPlan.assumptions}</Streamdown></div></div>
            )}
            {viewPlan?.recommendations && (
              <div><h3 className="text-sm font-semibold mb-2">Recommendations</h3><div className="prose prose-sm dark:prose-invert max-w-none bg-muted/50 rounded-lg p-4"><Streamdown>{viewPlan.recommendations}</Streamdown></div></div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {plans.isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : !plans.data?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calculator className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No workforce plans yet. Generate your first forecast.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.data.map(plan => (
            <Card key={plan.id} className="border-border/50 hover:shadow-sm transition-all">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium truncate">{plan.title}</h3>
                    <p className="text-[11px] text-muted-foreground mt-1">{new Date(plan.createdAt).toLocaleDateString()}</p>
                  </div>
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
          ))}
        </div>
      )}
    </div>
  );
}
