import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MiaGreeting, MiaAvatar } from "@/components/Mia";
import { VoiceInputButton } from "@/components/VoiceButton";
import { CheckSquare, Plus, Circle, Clock, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const statusConfig = {
  todo: { label: "To Do", icon: Circle, color: "text-muted-foreground" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-primary" },
  blocked: { label: "Blocked", icon: AlertCircle, color: "text-destructive" },
  done: { label: "Done", icon: CheckCircle2, color: "text-chart-2" },
};

const priorityColors: Record<string, string> = {
  low: "secondary", medium: "default", high: "destructive", urgent: "destructive",
};

export default function Tasks() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const tasks = trpc.tasks.list.useQuery({ status: filter === "all" ? undefined : filter });
  const utils = trpc.useUtils();

  const createTask = trpc.tasks.create.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); setDialogOpen(false); toast.success("Task created"); },
    onError: (err) => toast.error(err.message),
  });
  const updateTask = trpc.tasks.update.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); toast.success("Task updated"); },
  });
  const deleteTask = trpc.tasks.delete.useMutation({
    onSuccess: () => { utils.tasks.list.invalidate(); toast.success("Task deleted"); },
  });

  const [form, setForm] = useState({
    title: "", description: "", priority: "medium" as const,
    category: "general" as const, assignee: "", dueDate: "",
  });

  const handleCreate = () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    createTask.mutate({ ...form, dueDate: form.dueDate ? new Date(form.dueDate) : undefined });
  };

  const cycleStatus = (id: number, current: string) => {
    const order = ["todo", "in_progress", "blocked", "done"];
    const next = order[(order.indexOf(current) + 1) % order.length];
    updateTask.mutate({ id, status: next as any });
  };

  const openCount = tasks.data?.filter(t => t.status !== "done").length ?? 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-primary/5 via-card to-chart-3/5 rounded-2xl border border-border/40 p-6">
        <MiaGreeting
          userName={user?.name || undefined}
          greeting="Task Tracker"
          subtitle={tasks.data?.length ? `You have ${openCount} open task${openCount !== 1 ? "s" : ""} across your workstreams. Click the status icon to cycle through states.` : "No tasks yet. Create your first task to start tracking action items across workstreams."}
          mood="neutral"
        />
      </motion.div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {["all", "todo", "in_progress", "blocked", "done"].map(s => (
            <Button key={s} variant={filter === s ? "default" : "outline"} size="sm" onClick={() => setFilter(s)} className="text-xs">
              {s === "all" ? "All" : statusConfig[s as keyof typeof statusConfig]?.label}
            </Button>
          ))}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Task</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><MiaAvatar mood="speaking" size="sm" showGlow={false} />New Task</DialogTitle>
              <DialogDescription>I'll help you track this action item.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Title *</Label>
                <div className="flex gap-2">
                  <Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Review vendor SLA compliance" className="flex-1" />
                  <VoiceInputButton onTranscript={t => setForm(p => ({ ...p, title: p.title ? p.title + " " + t : t }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <div className="flex gap-2 items-start">
                  <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} className="flex-1" />
                  <VoiceInputButton onTranscript={t => setForm(p => ({ ...p, description: p.description ? p.description + " " + t : t }))} className="mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm(p => ({ ...p, priority: v as any }))}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(p => ({ ...p, category: v as any }))}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="vendor_mgmt">Vendor Mgmt</SelectItem><SelectItem value="quality">Quality</SelectItem><SelectItem value="workforce">Workforce</SelectItem><SelectItem value="reporting">Reporting</SelectItem><SelectItem value="process">Process</SelectItem><SelectItem value="general">General</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Assignee</Label><Input value={form.assignee} onChange={e => setForm(p => ({ ...p, assignee: e.target.value }))} placeholder="Name" /></div>
                <div className="space-y-2"><Label>Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} /></div>
              </div>
              <Button onClick={handleCreate} disabled={createTask.isPending} className="w-full">{createTask.isPending ? "Creating..." : "Create Task"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {tasks.isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : !tasks.data?.length ? (
        <Card className="border-dashed border-border/40">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MiaAvatar mood="neutral" size="lg" />
            <p className="text-sm text-muted-foreground mt-4">No tasks found. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.data.map((task, i) => {
            const sc = statusConfig[task.status as keyof typeof statusConfig] || statusConfig.todo;
            const StatusIcon = sc.icon;
            return (
              <motion.div key={task.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <Card className="border-border/40 hover:shadow-sm transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <button onClick={() => cycleStatus(task.id, task.status)} className="mt-0.5 shrink-0">
                        <StatusIcon className={`h-5 w-5 ${sc.color} transition-colors hover:opacity-70`} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => deleteTask.mutate({ id: task.id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant={(priorityColors[task.priority] || "secondary") as any} className="text-[10px] h-4">{task.priority}</Badge>
                          <Badge variant="outline" className="text-[10px] h-4">{task.category.replace(/_/g, " ")}</Badge>
                          {task.assignee && <span className="text-[11px] text-muted-foreground">→ {task.assignee}</span>}
                          {task.dueDate && <span className="text-[11px] text-muted-foreground">Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
