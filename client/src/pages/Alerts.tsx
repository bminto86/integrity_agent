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
import { Bell, Plus, AlertTriangle, CheckCircle2, Eye, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Alerts() {
  const [filter, setFilter] = useState("unread");
  const [createOpen, setCreateOpen] = useState(false);
  const alerts = trpc.alerts.list.useQuery({ onlyUnread: filter === "unread" });
  const utils = trpc.useUtils();

  const createAlert = trpc.alerts.create.useMutation({
    onSuccess: () => { utils.alerts.list.invalidate(); setCreateOpen(false); toast.success("Alert created"); },
    onError: (err: any) => toast.error(err.message),
  });

  const markRead = trpc.alerts.markRead.useMutation({
    onSuccess: () => { utils.alerts.list.invalidate(); },
  });

  const resolve = trpc.alerts.resolve.useMutation({
    onSuccess: () => { utils.alerts.list.invalidate(); toast.success("Alert resolved"); },
  });

  const [form, setForm] = useState({
    type: "general" as const, severity: "medium" as const,
    title: "", description: "",
  });

  const handleCreate = () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    createAlert.mutate(form);
  };

  const severityColors: Record<string, string> = {
    critical: "text-red-500 bg-red-500/10",
    high: "text-orange-500 bg-orange-500/10",
    medium: "text-yellow-500 bg-yellow-500/10",
    low: "text-muted-foreground bg-muted",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground mt-1">SLA violations, quality drops, and operational alerts.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Create Alert</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Alert</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="SLA breach detected" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(p => ({ ...p, type: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sla_breach">SLA Breach</SelectItem>
                      <SelectItem value="quality_drop">Quality Drop</SelectItem>
                      <SelectItem value="capacity_warning">Capacity Warning</SelectItem>
                      <SelectItem value="anomaly">Anomaly</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Severity</Label>
                  <Select value={form.severity} onValueChange={v => setForm(p => ({ ...p, severity: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} /></div>
              <Button onClick={handleCreate} disabled={createAlert.isPending} className="w-full">
                {createAlert.isPending ? "Creating..." : "Create Alert"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <Button variant={filter === "unread" ? "default" : "outline"} size="sm" onClick={() => setFilter("unread")} className="text-xs">Unread</Button>
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")} className="text-xs">All</Button>
      </div>

      {alerts.isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : !alerts.data?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">{filter === "unread" ? "No unread alerts" : "No alerts"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.data.map(alert => (
            <Card key={alert.id} className={`border-border/50 hover:shadow-sm transition-all ${alert.resolvedAt ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${severityColors[alert.severity] || severityColors.low}`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium">{alert.title}</h3>
                      <div className="flex items-center gap-1 shrink-0">
                        {!alert.isRead && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markRead.mutate({ id: alert.id })}>Mark read</Button>
                        )}
                        {!alert.resolvedAt && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600" onClick={() => resolve.mutate({ id: alert.id })}>
                            <CheckCircle2 className="h-3 w-3 mr-1" />Resolve
                          </Button>
                        )}
                      </div>
                    </div>
                    {alert.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{alert.description}</p>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant={alert.severity === "critical" || alert.severity === "high" ? "destructive" : "secondary"} className="text-[10px] h-4">{alert.severity}</Badge>
                      <Badge variant="outline" className="text-[10px] h-4">{alert.type.replace(/_/g, " ")}</Badge>
                      <Badge variant="outline" className="text-[10px] h-4">{alert.resolvedAt ? "resolved" : alert.isRead ? "read" : "new"}</Badge>
                      <span className="text-[11px] text-muted-foreground">{new Date(alert.createdAt).toLocaleString()}</span>
                    </div>
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
