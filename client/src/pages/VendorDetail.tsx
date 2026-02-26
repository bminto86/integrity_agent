import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MiaAvatar } from "@/components/Mia";
import { ArrowLeft, Plus, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function VendorDetail() {
  const params = useParams<{ id: string }>();
  const vendorId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();
  const [metricDialogOpen, setMetricDialogOpen] = useState(false);

  const vendor = trpc.vendors.get.useQuery({ id: vendorId });
  const metrics = trpc.metrics.getForVendor.useQuery({ vendorId });
  const utils = trpc.useUtils();

  const deleteVendor = trpc.vendors.delete.useMutation({
    onSuccess: () => { toast.success("Vendor deleted"); setLocation("/vendors"); },
  });

  const addMetric = trpc.metrics.add.useMutation({
    onSuccess: () => {
      utils.metrics.getForVendor.invalidate({ vendorId });
      setMetricDialogOpen(false);
      toast.success("Metric added");
    },
    onError: (err) => toast.error(err.message),
  });

  const [metricForm, setMetricForm] = useState({
    date: new Date().toISOString().split("T")[0],
    accuracyRate: 95, throughput: 100, responseTimeHours: 12,
    qualityScore: 90, reviewVolume: 500, falsePositiveRate: 3,
    falseNegativeRate: 2, escalationRate: 5, utilizationRate: 85,
  });

  const handleAddMetric = () => {
    addMetric.mutate({
      vendorId,
      date: new Date(metricForm.date),
      accuracyRate: metricForm.accuracyRate,
      throughput: metricForm.throughput,
      responseTimeHours: metricForm.responseTimeHours,
      qualityScore: metricForm.qualityScore,
      reviewVolume: metricForm.reviewVolume,
      falsePositiveRate: metricForm.falsePositiveRate,
      falseNegativeRate: metricForm.falseNegativeRate,
      escalationRate: metricForm.escalationRate,
      utilizationRate: metricForm.utilizationRate,
    });
  };

  const chartData = useMemo(() =>
    (metrics.data || []).map(m => ({
      date: new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      accuracy: m.accuracyRate,
      throughput: m.throughput,
      quality: m.qualityScore,
      responseTime: m.responseTimeHours,
    })),
    [metrics.data]
  );

  // Compute Mia's insight about this vendor
  const miaInsight = useMemo(() => {
    if (!vendor.data || !metrics.data?.length) return null;
    const v = vendor.data;
    const latest = metrics.data[metrics.data.length - 1];
    const issues: string[] = [];
    if (latest.accuracyRate !== null && v.slaAccuracyTarget && latest.accuracyRate < v.slaAccuracyTarget) {
      issues.push(`accuracy is ${latest.accuracyRate.toFixed(1)}% (target: ${v.slaAccuracyTarget}%)`);
    }
    if (latest.throughput !== null && v.slaThroughputTarget && latest.throughput < v.slaThroughputTarget) {
      issues.push(`throughput is ${latest.throughput.toFixed(0)}/hr (target: ${v.slaThroughputTarget}/hr)`);
    }
    if (latest.responseTimeHours !== null && v.slaResponseTimeTarget && latest.responseTimeHours > v.slaResponseTimeTarget) {
      issues.push(`response time is ${latest.responseTimeHours.toFixed(1)}hrs (target: ${v.slaResponseTimeTarget}hrs)`);
    }
    if (issues.length > 0) {
      return { mood: "concerned" as const, text: `I've noticed some SLA concerns: ${issues.join(", ")}. You may want to address these in your next vendor review.` };
    }
    return { mood: "happy" as const, text: `${v.name} is performing well against all SLA targets. Keep up the good partnership.` };
  }, [vendor.data, metrics.data]);

  if (vendor.isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;
  if (!vendor.data) return <div className="text-center py-12 text-muted-foreground">Vendor not found</div>;

  const v = vendor.data;

  return (
    <div className="space-y-6">
      {/* ─── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/vendors")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{v.name}</h1>
          <p className="text-sm text-muted-foreground">{v.region || "No region"} · {v.contactEmail || "No contact"}</p>
        </div>
        <Badge variant={v.contractStatus === "active" ? "default" : "secondary"}>{v.contractStatus}</Badge>
        <Button variant="destructive" size="sm" onClick={() => { if (confirm("Delete this vendor?")) deleteVendor.mutate({ id: vendorId }); }}>
          <Trash2 className="h-4 w-4 mr-1" />Delete
        </Button>
      </div>

      {/* ─── Mia Insight ──────────────────────────────────────────── */}
      {miaInsight && (
        <Card className={`border-border/50 ${miaInsight.mood === "concerned" ? "bg-orange-500/5 border-orange-500/20" : "bg-primary/5 border-primary/20"}`}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <MiaAvatar mood={miaInsight.mood} size="md" />
              <div className="flex-1 min-w-0 pt-1">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Mia's Assessment</p>
                <p className="text-sm text-foreground leading-relaxed">{miaInsight.text}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── SLA Targets ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Headcount", value: v.headcount || 0, icon: null },
          { label: "Accuracy Target", value: `${v.slaAccuracyTarget}%`, icon: null },
          { label: "Throughput Target", value: `${v.slaThroughputTarget}/hr`, icon: null },
          { label: "Response Time Target", value: `${v.slaResponseTimeTarget}hrs`, icon: null },
        ].map(item => (
          <Card key={item.label} className="border-border/50">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
              <p className="text-xl font-bold mt-1">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ─── Tabs ─────────────────────────────────────────────────── */}
      <Tabs defaultValue="charts">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="charts">Performance Charts</TabsTrigger>
            <TabsTrigger value="data">Raw Data</TabsTrigger>
          </TabsList>
          <Dialog open={metricDialogOpen} onOpenChange={setMetricDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Add Metric</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add Performance Metric</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={metricForm.date} onChange={e => setMetricForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2"><Label>Accuracy (%)</Label><Input type="number" value={metricForm.accuracyRate} onChange={e => setMetricForm(p => ({ ...p, accuracyRate: parseFloat(e.target.value) || 0 }))} /></div>
                  <div className="space-y-2"><Label>Throughput</Label><Input type="number" value={metricForm.throughput} onChange={e => setMetricForm(p => ({ ...p, throughput: parseFloat(e.target.value) || 0 }))} /></div>
                  <div className="space-y-2"><Label>Response (hrs)</Label><Input type="number" value={metricForm.responseTimeHours} onChange={e => setMetricForm(p => ({ ...p, responseTimeHours: parseFloat(e.target.value) || 0 }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2"><Label>Quality Score</Label><Input type="number" value={metricForm.qualityScore} onChange={e => setMetricForm(p => ({ ...p, qualityScore: parseFloat(e.target.value) || 0 }))} /></div>
                  <div className="space-y-2"><Label>Review Volume</Label><Input type="number" value={metricForm.reviewVolume} onChange={e => setMetricForm(p => ({ ...p, reviewVolume: parseInt(e.target.value) || 0 }))} /></div>
                  <div className="space-y-2"><Label>Utilization (%)</Label><Input type="number" value={metricForm.utilizationRate} onChange={e => setMetricForm(p => ({ ...p, utilizationRate: parseFloat(e.target.value) || 0 }))} /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2"><Label>FP Rate (%)</Label><Input type="number" value={metricForm.falsePositiveRate} onChange={e => setMetricForm(p => ({ ...p, falsePositiveRate: parseFloat(e.target.value) || 0 }))} /></div>
                  <div className="space-y-2"><Label>FN Rate (%)</Label><Input type="number" value={metricForm.falseNegativeRate} onChange={e => setMetricForm(p => ({ ...p, falseNegativeRate: parseFloat(e.target.value) || 0 }))} /></div>
                  <div className="space-y-2"><Label>Escalation (%)</Label><Input type="number" value={metricForm.escalationRate} onChange={e => setMetricForm(p => ({ ...p, escalationRate: parseFloat(e.target.value) || 0 }))} /></div>
                </div>
                <Button onClick={handleAddMetric} disabled={addMetric.isPending} className="w-full">
                  {addMetric.isPending ? "Adding..." : "Add Metric"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="charts" className="mt-4">
          {!chartData.length ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MiaAvatar mood="neutral" size="lg" />
                <p className="text-sm text-muted-foreground mt-4">No metrics data yet. Add your first metric to see charts.</p>
                <p className="text-xs text-muted-foreground mt-1">I'll start generating insights once you have data.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Accuracy & Quality</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                      <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="accuracy" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ r: 3 }} name="Accuracy %" />
                      <Line type="monotone" dataKey="quality" stroke="var(--color-chart-2)" strokeWidth={2} dot={{ r: 3 }} name="Quality Score" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Throughput & Response Time</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                      <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="throughput" stroke="var(--color-chart-4)" strokeWidth={2} dot={{ r: 3 }} name="Throughput" />
                      <Line type="monotone" dataKey="responseTime" stroke="var(--color-chart-5)" strokeWidth={2} dot={{ r: 3 }} name="Response Time (hrs)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="data" className="mt-4">
          {!metrics.data?.length ? (
            <Card className="border-dashed"><CardContent className="py-12 text-center text-muted-foreground text-sm">No metrics data yet.</CardContent></Card>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left text-xs font-medium text-muted-foreground">Date</th>
                        <th className="p-3 text-right text-xs font-medium text-muted-foreground">Accuracy</th>
                        <th className="p-3 text-right text-xs font-medium text-muted-foreground">Throughput</th>
                        <th className="p-3 text-right text-xs font-medium text-muted-foreground">Response</th>
                        <th className="p-3 text-right text-xs font-medium text-muted-foreground">Quality</th>
                        <th className="p-3 text-right text-xs font-medium text-muted-foreground">Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.data.map(m => (
                        <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3">{new Date(m.date).toLocaleDateString()}</td>
                          <td className="p-3 text-right tabular-nums">{m.accuracyRate?.toFixed(1)}%</td>
                          <td className="p-3 text-right tabular-nums">{m.throughput?.toFixed(0)}/hr</td>
                          <td className="p-3 text-right tabular-nums">{m.responseTimeHours?.toFixed(1)}hrs</td>
                          <td className="p-3 text-right tabular-nums">{m.qualityScore?.toFixed(1)}</td>
                          <td className="p-3 text-right tabular-nums">{m.reviewVolume}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
