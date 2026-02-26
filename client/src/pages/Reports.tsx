import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { MiaGreeting, MiaMessage, MiaAvatar } from "@/components/Mia";
import { FileText, Sparkles, Loader2, Trash2, Eye } from "lucide-react";
import { VoiceInputButton } from "@/components/VoiceButton";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { motion } from "framer-motion";

export default function Reports() {
  const { user } = useAuth();
  const [generateOpen, setGenerateOpen] = useState(false);
  const [viewReport, setViewReport] = useState<any>(null);
  const [reportType, setReportType] = useState<"weekly" | "monthly" | "quarterly" | "custom">("weekly");
  const [context, setContext] = useState("");
  const reports = trpc.reports.list.useQuery();
  const utils = trpc.useUtils();

  const generateReport = trpc.ai.generateReport.useMutation({
    onSuccess: async (data) => {
      const title = `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report - ${new Date().toLocaleDateString()}`;
      const content = typeof data.content === "string" ? data.content : "";
      await createReport.mutateAsync({ title, reportType, content });
      toast.success("Report generated and saved");
      setGenerateOpen(false);
      setContext("");
    },
    onError: (err) => toast.error(err.message),
  });

  const createReport = trpc.reports.create.useMutation({
    onSuccess: () => utils.reports.list.invalidate(),
  });

  const deleteReport = trpc.reports.delete.useMutation({
    onSuccess: () => { utils.reports.list.invalidate(); toast.success("Report deleted"); },
  });

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Mia Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-primary/5 via-card to-chart-2/5 rounded-2xl border border-border/40 p-6">
        <MiaGreeting
          userName={user?.name || undefined}
          greeting="Report Generator"
          subtitle="I'll compile your operational data into structured reports. Choose a report type and I'll pull in vendor metrics, alerts, tasks, and insights automatically."
          mood="speaking"
        />
      </motion.div>

      <div className="flex items-center justify-between">
        <div />
        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogTrigger asChild>
            <Button><Sparkles className="mr-2 h-4 w-4" />Ask Mia to Generate</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MiaAvatar mood="speaking" size="sm" showGlow={false} />
                Generate Report
              </DialogTitle>
              <DialogDescription>I'll analyze your current data and create a comprehensive report.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={v => setReportType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly Status</SelectItem>
                    <SelectItem value="monthly">Monthly Review</SelectItem>
                    <SelectItem value="quarterly">Quarterly Business Review</SelectItem>
                    <SelectItem value="custom">Custom Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Additional Context (optional)</Label>
                <div className="flex gap-2 items-start">
                  <Textarea value={context} onChange={e => setContext(e.target.value)} rows={4} placeholder="Any specific focus areas, recent events, or context to include..." className="flex-1" />
                  <VoiceInputButton onTranscript={t => setContext(p => p ? p + " " + t : t)} className="mt-1" />
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <MiaAvatar mood="neutral" size="sm" showGlow={false} />
                <p className="text-xs text-muted-foreground leading-relaxed">I'll use your current vendor data, metrics, alerts, and open tasks to generate this report.</p>
              </div>
              <Button onClick={() => generateReport.mutate({ reportType, context })} disabled={generateReport.isPending} className="w-full">
                {generateReport.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mia is writing...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate Report</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* View Report Dialog with Mia */}
      <Dialog open={!!viewReport} onOpenChange={() => setViewReport(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewReport?.title}</DialogTitle></DialogHeader>
          <MiaMessage content={viewReport?.content || ""} mood="speaking" avatarSize="sm" />
        </DialogContent>
      </Dialog>

      {reports.isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      ) : !reports.data?.length ? (
        <Card className="border-dashed border-border/40">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MiaAvatar mood="neutral" size="lg" />
            <p className="text-sm text-muted-foreground mt-4">No reports yet. Ask me to generate your first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.data.map((report, i) => (
            <motion.div key={report.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/40 hover:shadow-sm transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary shrink-0" />
                        <h3 className="text-sm font-medium truncate">{report.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary" className="text-[10px]">{report.reportType}</Badge>
                        <span className="text-[11px] text-muted-foreground">{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewReport(report)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteReport.mutate({ id: report.id })}><Trash2 className="h-4 w-4" /></Button>
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
