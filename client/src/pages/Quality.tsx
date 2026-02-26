import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Sparkles, Loader2, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from "recharts";

export default function Quality() {
  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const vendors = trpc.vendors.list.useQuery();
  const metrics = trpc.metrics.getAll.useQuery();

  const analyzeQuality = trpc.ai.qualityAnalysis.useMutation({
    onSuccess: (data: any) => {
      const content = typeof data.content === "string" ? data.content : "";
      setAnalysisResult(content);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredMetrics = useMemo(() => {
    if (!metrics.data) return [];
    if (selectedVendor === "all") return metrics.data;
    return metrics.data.filter((m: any) => m.vendorId === parseInt(selectedVendor));
  }, [metrics.data, selectedVendor]);

  const chartData = useMemo(() => {
    const byDate: Record<string, { date: string; accuracy: number[]; quality: number[]; throughput: number[]; fpRate: number[]; fnRate: number[] }> = {};
    filteredMetrics.forEach((m: any) => {
      const dateKey = new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!byDate[dateKey]) byDate[dateKey] = { date: dateKey, accuracy: [], quality: [], throughput: [], fpRate: [], fnRate: [] };
      if (m.accuracyRate) byDate[dateKey].accuracy.push(m.accuracyRate);
      if (m.qualityScore) byDate[dateKey].quality.push(m.qualityScore);
      if (m.throughput) byDate[dateKey].throughput.push(m.throughput);
      if (m.falsePositiveRate) byDate[dateKey].fpRate.push(m.falsePositiveRate);
      if (m.falseNegativeRate) byDate[dateKey].fnRate.push(m.falseNegativeRate);
    });
    const avg = (arr: number[]) => arr.length ? +(arr.reduce((a: number, b: number) => a + b, 0) / arr.length).toFixed(1) : 0;
    return Object.values(byDate).map(d => ({
      date: d.date,
      accuracy: avg(d.accuracy),
      quality: avg(d.quality),
      throughput: avg(d.throughput),
      fpRate: avg(d.fpRate),
      fnRate: avg(d.fnRate),
    }));
  }, [filteredMetrics]);

  const vendorComparison = useMemo(() => {
    if (!metrics.data || !vendors.data) return [];
    return vendors.data.map(v => {
      const vm = metrics.data!.filter((m: any) => m.vendorId === v.id);
      const avg = (arr: number[]) => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;
      return {
        name: v.name,
        accuracy: avg(vm.map((m: any) => m.accuracyRate || 0).filter(Boolean)),
        quality: avg(vm.map((m: any) => m.qualityScore || 0).filter(Boolean)),
        throughput: avg(vm.map((m: any) => m.throughput || 0).filter(Boolean)),
      };
    });
  }, [metrics.data, vendors.data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Quality Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Automated trend detection, anomaly alerts, and root cause analysis.</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={selectedVendor} onValueChange={setSelectedVendor}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter vendor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {vendors.data?.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => analyzeQuality.mutate({ vendorId: selectedVendor === "all" ? undefined : parseInt(selectedVendor) })} disabled={analyzeQuality.isPending}>
            {analyzeQuality.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <><Sparkles className="mr-2 h-4 w-4" />AI Analysis</>}
          </Button>
        </div>
      </div>

      {/* AI Analysis Result */}
      <Dialog open={!!analysisResult} onOpenChange={() => setAnalysisResult(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Quality Analysis</DialogTitle></DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <Streamdown>{analysisResult || ""}</Streamdown>
          </div>
        </DialogContent>
      </Dialog>

      {metrics.isLoading ? (
        <div className="space-y-4"><Skeleton className="h-64" /><Skeleton className="h-64" /></div>
      ) : !filteredMetrics.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No metrics data yet. Add metrics from the Vendors page.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Trend Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Accuracy & Quality Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="accuracy" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ r: 3 }} name="Accuracy %" />
                    <Line type="monotone" dataKey="quality" stroke="var(--color-chart-2)" strokeWidth={2} dot={{ r: 3 }} name="Quality Score" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Error Rates</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="fpRate" stroke="var(--color-chart-4)" strokeWidth={2} dot={{ r: 3 }} name="False Positive %" />
                    <Line type="monotone" dataKey="fnRate" stroke="var(--color-chart-5)" strokeWidth={2} dot={{ r: 3 }} name="False Negative %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Vendor Comparison */}
          {vendorComparison.length > 1 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Vendor Comparison</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={vendorComparison}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid var(--border)" }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="accuracy" fill="var(--color-chart-1)" name="Accuracy %" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="quality" fill="var(--color-chart-2)" name="Quality" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="throughput" fill="var(--color-chart-4)" name="Throughput" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
