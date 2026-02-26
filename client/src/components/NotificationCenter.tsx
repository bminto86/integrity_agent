import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { MiaAvatar } from "@/components/Mia";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, X, AlertTriangle, Clock, TrendingDown, Zap, FileText, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import { toast } from "sonner";

const TYPE_CONFIG: Record<string, { icon: typeof Bell; color: string; label: string }> = {
  sla_breach: { icon: AlertTriangle, color: "text-red-500", label: "SLA Breach" },
  task_overdue: { icon: Clock, color: "text-orange-500", label: "Overdue" },
  task_due_soon: { icon: Clock, color: "text-yellow-500", label: "Due Soon" },
  quality_drop: { icon: TrendingDown, color: "text-red-400", label: "Quality Drop" },
  capacity_warning: { icon: BarChart3, color: "text-amber-500", label: "Capacity" },
  scorecard_ready: { icon: FileText, color: "text-green-500", label: "Scorecard" },
  report_ready: { icon: FileText, color: "text-blue-500", label: "Report" },
  system: { icon: Zap, color: "text-primary", label: "System" },
  mia_insight: { icon: Zap, color: "text-indigo-500", label: "Insight" },
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/10 border-red-500/30 text-red-600",
  high: "bg-orange-500/10 border-orange-500/30 text-orange-600",
  medium: "bg-yellow-500/10 border-yellow-500/30 text-yellow-600",
  low: "bg-blue-500/10 border-blue-500/30 text-blue-600",
};

function timeAgo(date: Date | string): string {
  const now = new Date();
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const { data: unreadCount = 0 } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000, // Poll every 30 seconds
    refetchOnWindowFocus: true,
  });

  const { data: notificationsList = [] } = trpc.notifications.list.useQuery(
    { limit: 20 },
    {
      enabled: isOpen,
      refetchInterval: isOpen ? 15000 : false,
    }
  );

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  const dismissMutation = trpc.notifications.dismiss.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const runSlaCheckMutation = trpc.notifications.runSlaCheck.useMutation({
    onSuccess: (data) => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
      if (data.count > 0) {
        toast.error(`Mia found ${data.count} SLA breach${data.count > 1 ? "es" : ""}`, {
          description: "Check your notifications for details.",
        });
      } else {
        toast.success("All clear — no SLA breaches detected", {
          description: "Mia checked all active vendor metrics against SLA targets.",
        });
      }
    },
  });

  const runTaskCheckMutation = trpc.notifications.runTaskCheck.useMutation({
    onSuccess: (data) => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
      if (data.count > 0) {
        toast.warning(`Mia found ${data.count} task reminder${data.count > 1 ? "s" : ""}`, {
          description: "Check your notifications for overdue and upcoming tasks.",
        });
      } else {
        toast.success("All tasks on track", {
          description: "No overdue or upcoming deadline tasks found.",
        });
      }
    },
  });

  // Proactive toast for new critical notifications
  const [lastCount, setLastCount] = useState(0);
  useEffect(() => {
    if (typeof unreadCount === "number" && unreadCount > lastCount && lastCount > 0) {
      toast("Mia has a new alert for you", {
        description: "Click the bell icon to see details.",
        icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
      });
    }
    if (typeof unreadCount === "number") setLastCount(unreadCount);
  }, [unreadCount, lastCount]);

  const handleNotificationClick = useCallback((notification: { id: number; actionUrl: string | null; isRead: boolean }) => {
    if (!notification.isRead) {
      markReadMutation.mutate({ id: notification.id });
    }
    if (notification.actionUrl) {
      setLocation(notification.actionUrl);
      setIsOpen(false);
    }
  }, [markReadMutation, setLocation]);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-accent transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        {typeof unreadCount === "number" && unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-full mt-2 w-[420px] max-h-[600px] bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-border bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MiaAvatar mood="neutral" size="sm" showGlow={false} />
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Mia's Alerts</h3>
                      <p className="text-[10px] text-muted-foreground">
                        {typeof unreadCount === "number" && unreadCount > 0
                          ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                          : "All caught up"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {typeof unreadCount === "number" && unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAllReadMutation.mutate()}
                        className="h-7 text-xs"
                      >
                        <CheckCheck className="h-3.5 w-3.5 mr-1" />
                        Mark all read
                      </Button>
                    )}
                  </div>
                </div>

                {/* Quick action buttons */}
                <div className="flex gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex-1"
                    onClick={() => runSlaCheckMutation.mutate()}
                    disabled={runSlaCheckMutation.isPending}
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {runSlaCheckMutation.isPending ? "Checking..." : "Run SLA Check"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex-1"
                    onClick={() => runTaskCheckMutation.mutate()}
                    disabled={runTaskCheckMutation.isPending}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    {runTaskCheckMutation.isPending ? "Checking..." : "Check Deadlines"}
                  </Button>
                </div>
              </div>

              {/* Notification list */}
              <ScrollArea className="max-h-[440px]">
                {notificationsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <MiaAvatar mood="happy" size="md" />
                    <p className="text-sm font-medium text-foreground mt-3">All clear!</p>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      No notifications right now. I'll alert you when something needs your attention.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {notificationsList.map((notification) => {
                      const config = TYPE_CONFIG[notification.type] || TYPE_CONFIG.system;
                      const Icon = config.icon;
                      const severityClass = SEVERITY_COLORS[notification.severity] || SEVERITY_COLORS.medium;

                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`px-4 py-3 hover:bg-accent/50 cursor-pointer transition-colors ${
                            !notification.isRead ? "bg-primary/5" : ""
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 p-1.5 rounded-lg border ${severityClass}`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
                                  {config.label}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {timeAgo(notification.createdAt)}
                                </span>
                                {!notification.isRead && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                )}
                              </div>
                              <p className="text-sm font-medium text-foreground mt-1 leading-snug">
                                {notification.title}
                              </p>
                              {notification.message && (
                                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                                  {notification.message}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {!notification.isRead && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markReadMutation.mutate({ id: notification.id });
                                  }}
                                  className="p-1 rounded hover:bg-accent transition-colors"
                                  title="Mark as read"
                                >
                                  <Check className="h-3.5 w-3.5 text-muted-foreground" />
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  dismissMutation.mutate({ id: notification.id });
                                }}
                                className="p-1 rounded hover:bg-accent transition-colors"
                                title="Dismiss"
                              >
                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Footer */}
              {notificationsList.length > 0 && (
                <div className="px-4 py-2 border-t border-border bg-muted/30">
                  <button
                    onClick={() => {
                      setLocation("/alerts");
                      setIsOpen(false);
                    }}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors w-full text-center"
                  >
                    View all alerts →
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
