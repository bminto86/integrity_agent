import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MiaGreeting, MiaInsight, MiaQuickActions, MiaSection, MiaAvatar } from "@/components/Mia";
import {
  Building2, AlertTriangle, CheckSquare, Users, ArrowRight,
  FileText, Mail, Calculator, BarChart3, Award, FileEdit,
  MessageSquare, Zap, Settings2, Upload,
} from "lucide-react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useMemo, useCallback } from "react";
import { toast } from "sonner";

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const stats = trpc.dashboard.stats.useQuery();
  const alerts = trpc.alerts.list.useQuery({ onlyUnread: true });
  const tasks = trpc.tasks.list.useQuery({ status: "todo" });
  const vendors = trpc.vendors.list.useQuery();

  // Voice command handler — routes spoken commands to the right page
  const handleVoiceCommand = useCallback((text: string) => {
    const lower = text.toLowerCase();
    toast.info(`Heard: "${text}"`);
    if (lower.includes("vendor") || lower.includes("supplier")) setLocation("/vendors");
    else if (lower.includes("report") || lower.includes("status")) setLocation("/reports");
    else if (lower.includes("meeting") || lower.includes("1:1") || lower.includes("one on one")) setLocation("/meetings");
    else if (lower.includes("task") || lower.includes("action item") || lower.includes("to do")) setLocation("/tasks");
    else if (lower.includes("quality") || lower.includes("analytics") || lower.includes("trend")) setLocation("/quality");
    else if (lower.includes("workforce") || lower.includes("staffing") || lower.includes("headcount") || lower.includes("forecast")) setLocation("/workforce");
    else if (lower.includes("scorecard") || lower.includes("score card")) setLocation("/scorecards");
    else if (lower.includes("document") || lower.includes("sop") || lower.includes("training")) setLocation("/documents");
    else if (lower.includes("summarize") || lower.includes("summary") || lower.includes("summarise")) setLocation("/summarizer");
    else if (lower.includes("communication") || lower.includes("email") || lower.includes("draft") || lower.includes("escalat")) setLocation("/communications");
    else if (lower.includes("alert") || lower.includes("breach")) setLocation("/alerts");
    else if (lower.includes("connection") || lower.includes("import") || lower.includes("data source")) setLocation("/connections");
    else toast.info("Try saying something like: 'Show me vendors', 'Generate a report', or 'Prep for my 1:1'");
  }, [setLocation]);

  const vendorCount = stats.data?.vendorCount ?? 0;
  const alertCount = stats.data?.activeAlerts ?? 0;
  const taskCount = stats.data?.openTasks ?? 0;
  const meetingCount = stats.data?.upcomingMeetings ?? 0;

  // Build dynamic subtitle based on actual data
  const subtitle = useMemo(() => {
    if (stats.isLoading) return "Let me pull together your latest operations data...";
    const parts: string[] = [];
    if (vendorCount > 0) parts.push(`You have **${vendorCount} active vendor${vendorCount > 1 ? "s" : ""}**`);
    if (alertCount > 0) parts.push(`**${alertCount} alert${alertCount > 1 ? "s" : ""}** need${alertCount === 1 ? "s" : ""} attention`);
    if (taskCount > 0) parts.push(`**${taskCount} open task${taskCount > 1 ? "s" : ""}** to track`);
    if (parts.length === 0) return "Everything looks clear. Let's set up your vendors and start tracking operations.";
    return parts.join(", ") + ". Here's what I'd focus on today.";
  }, [stats.isLoading, vendorCount, alertCount, taskCount]);

  // Quick actions Mia suggests
  const quickActions = [
    { label: "Review vendors", icon: <Building2 className="h-3.5 w-3.5" />, onClick: () => setLocation("/vendors") },
    { label: "Generate report", icon: <FileText className="h-3.5 w-3.5" />, onClick: () => setLocation("/reports") },
    { label: "Prep for 1:1", icon: <Users className="h-3.5 w-3.5" />, onClick: () => setLocation("/meetings") },
    { label: "Draft comms", icon: <Mail className="h-3.5 w-3.5" />, onClick: () => setLocation("/communications") },
    { label: "Quality check", icon: <BarChart3 className="h-3.5 w-3.5" />, onClick: () => setLocation("/quality") },
    { label: "Workforce plan", icon: <Calculator className="h-3.5 w-3.5" />, onClick: () => setLocation("/workforce") },
  ];

  // Build proactive insights from data
  const insights = useMemo(() => {
    const items: Array<{ title: string; content: string; type: "info" | "warning" | "success" | "alert"; action?: string; path?: string }> = [];

    if (alertCount > 0) {
      items.push({
        title: `${alertCount} alert${alertCount > 1 ? "s" : ""} requiring attention`,
        content: "I've detected unresolved alerts that may impact SLA compliance. Let me walk you through them.",
        type: "alert",
        action: "Review alerts",
        path: "/alerts",
      });
    }

    if (taskCount > 5) {
      items.push({
        title: "Task backlog growing",
        content: `You have ${taskCount} open tasks. Consider prioritizing or delegating to keep workstreams on track.`,
        type: "warning",
        action: "Manage tasks",
        path: "/tasks",
      });
    }

    if (vendorCount === 0) {
      items.push({
        title: "Let's get started",
        content: "Add your first vendor to unlock performance tracking, scorecards, and AI-powered insights.",
        type: "info",
        action: "Add vendor",
        path: "/vendors",
      });
    }

    if (vendorCount > 0 && alertCount === 0 && taskCount <= 2) {
      items.push({
        title: "Operations looking healthy",
        content: "No critical alerts and a manageable task load. A good time to run a quality analysis or generate a status report.",
        type: "success",
        action: "Run quality check",
        path: "/quality",
      });
    }

    return items;
  }, [alertCount, taskCount, vendorCount]);

  const statCards = [
    { label: "Active Vendors", value: vendorCount, icon: Building2, color: "text-primary", bgColor: "bg-primary/10", path: "/vendors" },
    { label: "Active Alerts", value: alertCount, icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10", path: "/alerts" },
    { label: "Open Tasks", value: taskCount, icon: CheckSquare, color: "text-chart-2", bgColor: "bg-chart-2/10", path: "/tasks" },
    { label: "Meetings", value: meetingCount, icon: Users, color: "text-chart-3", bgColor: "bg-chart-3/10", path: "/meetings" },
  ];

  const toolCards = [
    { label: "Vendor Scorecards", desc: "AI-generated performance scorecards", icon: Award, path: "/scorecards" },
    { label: "Meeting Summarizer", desc: "Summarize notes, extract action items", icon: MessageSquare, path: "/summarizer" },
    { label: "Document Generator", desc: "SOPs, training materials, policies", icon: FileEdit, path: "/documents" },
    { label: "Data Connections", desc: "Configure data sources and integrations", icon: Settings2, path: "/connections" },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* ─── Mia Greeting Hero ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-br from-primary/5 via-card to-chart-2/5 rounded-2xl border border-border/40 p-6 md:p-8"
      >
        <MiaGreeting
          userName={user?.name || undefined}
          mood={stats.isLoading ? "thinking" : alertCount > 0 ? "speaking" : "neutral"}
          subtitle={subtitle}
          actions={<MiaQuickActions actions={quickActions} />}
          onVoiceInput={handleVoiceCommand}
        />
      </motion.div>

      {/* ─── Proactive Insights from Mia ───────────────────────────────── */}
      {insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2 ml-1">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mia's Insights</span>
          </div>
          {insights.map((insight, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.15 }}
            >
              <MiaInsight
                title={insight.title}
                content={insight.content}
                type={insight.type}
                action={insight.action}
                onAction={insight.path ? () => setLocation(insight.path!) : undefined}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ─── Stats at a Glance ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.08 }}
          >
            <Card
              className="cursor-pointer hover:shadow-md transition-all border-border/40 hover:border-primary/20"
              onClick={() => setLocation(card.path)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                    {stats.isLoading ? (
                      <Skeleton className="h-7 w-12" />
                    ) : (
                      <p className="text-2xl font-bold tabular-nums">{card.value}</p>
                    )}
                  </div>
                  <div className={`h-9 w-9 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                    <card.icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ─── Alerts & Tasks with Mia context ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
          <Card className="border-border/40">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h3 className="text-sm font-semibold">Active Alerts</h3>
                </div>
                <button onClick={() => setLocation("/alerts")} className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                  View all <ArrowRight className="inline h-3 w-3 ml-0.5" />
                </button>
              </div>
              {alerts.isLoading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : !alerts.data?.length ? (
                <div className="flex items-center gap-3 py-4">
                  <MiaAvatar mood="neutral" size="sm" showGlow={false} />
                  <p className="text-sm text-muted-foreground">All clear — no active alerts right now.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.data.slice(0, 4).map(alert => (
                    <div key={alert.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer" onClick={() => setLocation("/alerts")}>
                      <div className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                        alert.severity === "critical" ? "bg-destructive" :
                        alert.severity === "high" ? "bg-warning" : "bg-muted-foreground"
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{alert.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant={alert.severity === "critical" || alert.severity === "high" ? "destructive" : "secondary"} className="text-[10px] h-4">
                            {alert.severity}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Tasks */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>
          <Card className="border-border/40">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-chart-2" />
                  <h3 className="text-sm font-semibold">Open Tasks</h3>
                </div>
                <button onClick={() => setLocation("/tasks")} className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                  View all <ArrowRight className="inline h-3 w-3 ml-0.5" />
                </button>
              </div>
              {tasks.isLoading ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : !tasks.data?.length ? (
                <div className="flex items-center gap-3 py-4">
                  <MiaAvatar mood="neutral" size="sm" showGlow={false} />
                  <p className="text-sm text-muted-foreground">No open tasks. Create one to start tracking.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tasks.data.slice(0, 4).map(task => (
                    <div key={task.id} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors cursor-pointer" onClick={() => setLocation("/tasks")}>
                      <CheckSquare className="h-3.5 w-3.5 mt-1 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant={task.priority === "urgent" ? "destructive" : "secondary"} className="text-[10px] h-4">
                            {task.priority}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{task.category.replace(/_/g, " ")}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ─── Mia's Toolkit ─────────────────────────────────────────────── */}
      <MiaSection
        title="What can I help you with?"
        description="Pick a tool and I'll guide you through it."
        mood="speaking"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {toolCards.map((tool, i) => (
            <motion.div
              key={tool.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 + i * 0.08 }}
            >
              <Card
                className="cursor-pointer hover:shadow-md transition-all border-border/40 hover:border-primary/20 group"
                onClick={() => setLocation(tool.path)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-colors shrink-0">
                    <tool.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{tool.label}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{tool.desc}</p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </MiaSection>

      {/* ─── Vendor Overview ───────────────────────────────────────────── */}
      {vendors.data && vendors.data.length > 0 && (
        <MiaSection
          title="Your Vendors"
          description={`Tracking ${vendors.data.length} vendor${vendors.data.length > 1 ? "s" : ""} across your operations.`}
          mood="neutral"
        >
          <Card className="border-border/40">
            <CardContent className="p-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground text-xs">Vendor</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs">Region</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs">Status</th>
                      <th className="pb-2 font-medium text-muted-foreground text-xs text-right">Headcount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.data.slice(0, 5).map(vendor => (
                      <tr
                        key={vendor.id}
                        className="border-b last:border-0 hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() => setLocation(`/vendors/${vendor.id}`)}
                      >
                        <td className="py-2.5 font-medium">{vendor.name}</td>
                        <td className="py-2.5 text-muted-foreground">{vendor.region || "—"}</td>
                        <td className="py-2.5">
                          <Badge variant={vendor.contractStatus === "active" ? "default" : "secondary"} className="text-[10px]">
                            {vendor.contractStatus}
                          </Badge>
                        </td>
                        <td className="py-2.5 text-right tabular-nums">{vendor.headcount || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </MiaSection>
      )}
    </div>
  );
}
