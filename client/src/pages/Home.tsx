import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, AlertTriangle, CheckSquare, Users, ArrowRight,
  TrendingUp, TrendingDown, Activity, Shield,
} from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();
  const stats = trpc.dashboard.stats.useQuery();
  const alerts = trpc.alerts.list.useQuery({ onlyUnread: true });
  const tasks = trpc.tasks.list.useQuery({ status: "todo" });
  const vendors = trpc.vendors.list.useQuery();

  const statCards = [
    { label: "Active Vendors", value: stats.data?.vendorCount ?? 0, icon: Building2, color: "text-primary", bgColor: "bg-primary/10", path: "/vendors" },
    { label: "Active Alerts", value: stats.data?.activeAlerts ?? 0, icon: AlertTriangle, color: "text-destructive", bgColor: "bg-destructive/10", path: "/alerts" },
    { label: "Open Tasks", value: stats.data?.openTasks ?? 0, icon: CheckSquare, color: "text-chart-2", bgColor: "bg-chart-2/10", path: "/tasks" },
    { label: "Upcoming Meetings", value: stats.data?.upcomingMeetings ?? 0, icon: Users, color: "text-chart-3", bgColor: "bg-chart-3/10", path: "/meetings" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Integrity Operations command center — vendor oversight, team coordination, and operational intelligence.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(card => (
          <Card
            key={card.label}
            className="cursor-pointer hover:shadow-md transition-all border-border/50"
            onClick={() => setLocation(card.path)}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{card.label}</p>
                  {stats.isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-2xl font-bold">{card.value}</p>
                  )}
                </div>
                <div className={`h-10 w-10 rounded-lg ${card.bgColor} flex items-center justify-center`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Alerts */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Recent Alerts</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/alerts")} className="text-xs">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {alerts.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !alerts.data?.length ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Shield className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No active alerts</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.data.slice(0, 5).map(alert => (
                  <div key={alert.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${
                      alert.severity === "critical" ? "text-destructive" :
                      alert.severity === "high" ? "text-warning" :
                      "text-muted-foreground"
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{alert.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={alert.severity === "critical" || alert.severity === "high" ? "destructive" : "secondary"} className="text-[10px] h-4">
                          {alert.severity}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">{alert.type.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Open Tasks */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Open Tasks</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/tasks")} className="text-xs">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tasks.isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !tasks.data?.length ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckSquare className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No open tasks</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.data.slice(0, 5).map(task => (
                  <div key={task.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <CheckSquare className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={task.priority === "urgent" ? "destructive" : "secondary"} className="text-[10px] h-4">
                          {task.priority}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">{task.category.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vendor Overview */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Vendor Overview</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/vendors")} className="text-xs">
              Manage vendors <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {vendors.isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : !vendors.data?.length ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Building2 className="h-8 w-8 mb-2 opacity-30" />
              <p className="text-sm">No vendors added yet</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setLocation("/vendors")}>
                Add your first vendor
              </Button>
            </div>
          ) : (
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
                      className="border-b last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
