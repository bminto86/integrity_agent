import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  AlertTriangle, Plus, Play, Shield, Clock, ChevronRight,
  Trash2, Edit, Zap, Eye, BarChart3, FileText, Activity,
} from "lucide-react";

const METRICS = [
  { value: "accuracyRate", label: "Accuracy Rate" },
  { value: "throughput", label: "Throughput" },
  { value: "responseTimeHours", label: "Response Time (hrs)" },
  { value: "qualityScore", label: "Quality Score" },
  { value: "falsePositiveRate", label: "False Positive Rate" },
  { value: "falseNegativeRate", label: "False Negative Rate" },
  { value: "escalationRate", label: "Escalation Rate" },
  { value: "utilizationRate", label: "Utilization Rate" },
];

const OPERATORS = [
  { value: "lt", label: "< Less than" },
  { value: "lte", label: "≤ Less than or equal" },
  { value: "gt", label: "> Greater than" },
  { value: "gte", label: "≥ Greater than or equal" },
  { value: "eq", label: "= Equal to" },
];

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-800 border-blue-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  awaiting_vendor: "bg-amber-100 text-amber-800",
  vendor_responded: "bg-green-100 text-green-800",
  under_review: "bg-purple-100 text-purple-800",
  resolved: "bg-emerald-100 text-emerald-800",
  closed: "bg-gray-100 text-gray-800",
  auto_escalated: "bg-red-100 text-red-800",
};

type Condition = { metric: string; operator: string; threshold: number };

export default function Escalations() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("cases");
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [showCaseDialog, setShowCaseDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);

  // Data queries
  const { data: cases = [], refetch: refetchCases } = trpc.escalation.cases.list.useQuery({});
  const { data: rules = [], refetch: refetchRules } = trpc.escalation.rules.list.useQuery();
  const { data: stats } = trpc.escalation.cases.stats.useQuery();
  const { data: vendors = [] } = trpc.vendors.list.useQuery();

  // Mutations
  const evaluateRules = trpc.escalation.rules.evaluate.useMutation({
    onSuccess: (data) => {
      if (data.count > 0) {
        toast.success(`${data.count} escalation(s) triggered`, {
          description: data.triggered.map(t => `${t.vendorName}: ${t.caseRef}`).join(", "),
        });
      } else {
        toast.info("No escalations triggered — all metrics within thresholds.");
      }
      refetchCases();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteRule = trpc.escalation.rules.delete.useMutation({
    onSuccess: () => { toast.success("Rule deleted"); refetchRules(); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            Escalation Engine
          </h1>
          <p className="text-muted-foreground mt-1">
            Automated vendor escalation with AI-powered case management
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => evaluateRules.mutate()}
            disabled={evaluateRules.isPending}
          >
            <Play className="h-4 w-4 mr-2" />
            {evaluateRules.isPending ? "Evaluating..." : "Run Rules"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
            <div className="text-xs text-muted-foreground">Total Cases</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-orange-600">{stats?.open ?? 0}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-amber-600">{stats?.awaitingVendor ?? 0}</div>
            <div className="text-xs text-muted-foreground">Awaiting Vendor</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-emerald-600">{stats?.resolved ?? 0}</div>
            <div className="text-xs text-muted-foreground">Resolved</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="cases" className="gap-1">
            <FileText className="h-4 w-4" /> Cases
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1">
            <Zap className="h-4 w-4" /> Rules
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1">
            <Shield className="h-4 w-4" /> Security
          </TabsTrigger>
        </TabsList>

        {/* Cases Tab */}
        <TabsContent value="cases" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Escalation Cases</h2>
            <Button onClick={() => setShowCaseDialog(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Manual Escalation
            </Button>
          </div>

          {cases.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">No escalation cases yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create rules and run them to auto-detect issues, or create a manual escalation.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {cases.map((c: any) => (
                <Card
                  key={c.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/escalations/${c.id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge variant="outline" className={SEVERITY_COLORS[c.severity] || ""}>
                          {c.severity}
                        </Badge>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{c.caseRef} — {c.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {vendors.find((v: any) => v.id === c.vendorId)?.name || `Vendor #${c.vendorId}`}
                            {c.responseDeadline && (
                              <span className="ml-2">
                                <Clock className="h-3 w-3 inline mr-1" />
                                Deadline: {new Date(c.responseDeadline).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={STATUS_COLORS[c.status] || ""}>{c.status.replace(/_/g, " ")}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Rules Tab */}
        <TabsContent value="rules" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Escalation Rules</h2>
            <Button onClick={() => { setEditingRule(null); setShowRuleDialog(true); }} size="sm">
              <Plus className="h-4 w-4 mr-1" /> New Rule
            </Button>
          </div>

          {rules.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Zap className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">No escalation rules configured.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Create rules with multi-condition triggers to automatically detect vendor issues.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {rules.map((rule: any) => {
                const conditions = (rule.conditions || []) as Condition[];
                return (
                  <Card key={rule.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${rule.isActive ? "bg-green-500" : "bg-gray-300"}`} />
                          <div>
                            <div className="font-medium">{rule.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {conditions.length} condition{conditions.length !== 1 ? "s" : ""} ({rule.conditionLogic?.toUpperCase()})
                              {" · "}
                              <Badge variant="outline" className={SEVERITY_COLORS[rule.severity] || ""}>
                                {rule.severity}
                              </Badge>
                              {" · "}
                              {rule.responseDeadlineHours}h deadline
                              {" · "}
                              {rule.cooldownHours}h cooldown
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {conditions.map((c, i) => {
                                const metricLabel = METRICS.find(m => m.value === c.metric)?.label || c.metric;
                                const opLabel = OPERATORS.find(o => o.value === c.operator)?.label?.charAt(0) || c.operator;
                                return (
                                  <span key={i}>
                                    {i > 0 && <span className="mx-1 font-semibold">{rule.conditionLogic?.toUpperCase()}</span>}
                                    {metricLabel} {opLabel} {c.threshold}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => { setEditingRule(rule); setShowRuleDialog(true); }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            onClick={() => { if (confirm("Delete this rule?")) deleteRule.mutate({ id: rule.id }); }}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <SecurityPanel vendors={vendors} />
        </TabsContent>
      </Tabs>

      {/* Rule Dialog */}
      <RuleDialog
        open={showRuleDialog}
        onOpenChange={setShowRuleDialog}
        editingRule={editingRule}
        vendors={vendors}
        onSuccess={() => { refetchRules(); setShowRuleDialog(false); }}
      />

      {/* Manual Case Dialog */}
      <ManualCaseDialog
        open={showCaseDialog}
        onOpenChange={setShowCaseDialog}
        vendors={vendors}
        onSuccess={() => { refetchCases(); setShowCaseDialog(false); }}
      />
    </div>
  );
}

// ─── Rule Create/Edit Dialog ──────────────────────────────────────────────

function RuleDialog({ open, onOpenChange, editingRule, vendors, onSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRule: any;
  vendors: any[];
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [conditionLogic, setConditionLogic] = useState<"and" | "or">("and");
  const [conditions, setConditions] = useState<Condition[]>([{ metric: "accuracyRate", operator: "lt", threshold: 90 }]);
  const [severity, setSeverity] = useState<string>("high");
  const [responseDeadlineHours, setResponseDeadlineHours] = useState(48);
  const [followUpIntervalHours, setFollowUpIntervalHours] = useState(24);
  const [maxFollowUps, setMaxFollowUps] = useState(3);
  const [cooldownHours, setCooldownHours] = useState(24);
  const [vendorScope, setVendorScope] = useState<number[]>([]);
  const [allVendors, setAllVendors] = useState(true);

  // Reset form when dialog opens
  useMemo(() => {
    if (open) {
      if (editingRule) {
        setName(editingRule.name || "");
        setDescription(editingRule.description || "");
        setConditionLogic(editingRule.conditionLogic || "and");
        setConditions(editingRule.conditions || [{ metric: "accuracyRate", operator: "lt", threshold: 90 }]);
        setSeverity(editingRule.severity || "high");
        setResponseDeadlineHours(editingRule.responseDeadlineHours || 48);
        setFollowUpIntervalHours(editingRule.followUpIntervalHours || 24);
        setMaxFollowUps(editingRule.maxFollowUps || 3);
        setCooldownHours(editingRule.cooldownHours || 24);
        const vs = editingRule.vendorScope as number[] | null;
        setVendorScope(vs || []);
        setAllVendors(!vs || vs.length === 0);
      } else {
        setName("");
        setDescription("");
        setConditionLogic("and");
        setConditions([{ metric: "accuracyRate", operator: "lt", threshold: 90 }]);
        setSeverity("high");
        setResponseDeadlineHours(48);
        setFollowUpIntervalHours(24);
        setMaxFollowUps(3);
        setCooldownHours(24);
        setVendorScope([]);
        setAllVendors(true);
      }
    }
  }, [open, editingRule]);

  const createRule = trpc.escalation.rules.create.useMutation({
    onSuccess: () => { toast.success("Rule created"); onSuccess(); },
    onError: (err) => toast.error(err.message),
  });
  const updateRule = trpc.escalation.rules.update.useMutation({
    onSuccess: () => { toast.success("Rule updated"); onSuccess(); },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Rule name is required"); return; }
    if (conditions.length === 0) { toast.error("At least one condition is required"); return; }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      conditionLogic,
      conditions: conditions.map(c => ({
        metric: c.metric as any,
        operator: c.operator as any,
        threshold: c.threshold,
      })),
      severity: severity as any,
      responseDeadlineHours,
      followUpIntervalHours,
      maxFollowUps,
      cooldownHours,
      vendorScope: allVendors ? undefined : vendorScope,
    };

    if (editingRule) {
      updateRule.mutate({ id: editingRule.id, ...payload });
    } else {
      createRule.mutate(payload);
    }
  };

  const addCondition = () => {
    setConditions([...conditions, { metric: "throughput", operator: "lt", threshold: 100 }]);
  };

  const removeCondition = (idx: number) => {
    setConditions(conditions.filter((_, i) => i !== idx));
  };

  const updateCondition = (idx: number, field: keyof Condition, value: any) => {
    setConditions(conditions.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingRule ? "Edit Rule" : "Create Escalation Rule"}</DialogTitle>
          <DialogDescription>
            Define conditions that automatically trigger vendor escalations when metrics breach thresholds.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Rule Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Critical Accuracy Drop" />
            </div>
            <div className="col-span-2">
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this rule detect?" rows={2} />
            </div>
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">Trigger Conditions</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Logic:</span>
                <Select value={conditionLogic} onValueChange={(v: "and" | "or") => setConditionLogic(v)}>
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="and">AND</SelectItem>
                    <SelectItem value="or">OR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              {conditions.map((cond, idx) => (
                <div key={idx} className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                  {idx > 0 && (
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {conditionLogic.toUpperCase()}
                    </Badge>
                  )}
                  <Select value={cond.metric} onValueChange={v => updateCondition(idx, "metric", v)}>
                    <SelectTrigger className="w-44 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {METRICS.map(m => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={cond.operator} onValueChange={v => updateCondition(idx, "operator", v)}>
                    <SelectTrigger className="w-36 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={cond.threshold}
                    onChange={e => updateCondition(idx, "threshold", parseFloat(e.target.value) || 0)}
                    className="w-24 h-8"
                  />
                  {conditions.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeCondition(idx)}>
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-2" onClick={addCondition}>
              <Plus className="h-3 w-3 mr-1" /> Add Condition
            </Button>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Response Deadline (hours)</Label>
              <Input type="number" value={responseDeadlineHours} onChange={e => setResponseDeadlineHours(parseInt(e.target.value) || 48)} />
            </div>
            <div>
              <Label>Follow-up Interval (hours)</Label>
              <Input type="number" value={followUpIntervalHours} onChange={e => setFollowUpIntervalHours(parseInt(e.target.value) || 24)} />
            </div>
            <div>
              <Label>Max Follow-ups</Label>
              <Input type="number" value={maxFollowUps} onChange={e => setMaxFollowUps(parseInt(e.target.value) || 3)} />
            </div>
            <div>
              <Label>Cooldown (hours)</Label>
              <Input type="number" value={cooldownHours} onChange={e => setCooldownHours(parseInt(e.target.value) || 24)} />
            </div>
          </div>

          {/* Vendor Scope */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Switch checked={allVendors} onCheckedChange={setAllVendors} />
              <Label>Apply to all active vendors</Label>
            </div>
            {!allVendors && (
              <div className="flex flex-wrap gap-2 mt-2">
                {vendors.map((v: any) => (
                  <Badge
                    key={v.id}
                    variant={vendorScope.includes(v.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setVendorScope(
                        vendorScope.includes(v.id)
                          ? vendorScope.filter(id => id !== v.id)
                          : [...vendorScope, v.id]
                      );
                    }}
                  >
                    {v.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createRule.isPending || updateRule.isPending}>
            {editingRule ? "Update Rule" : "Create Rule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Manual Case Dialog ───────────────────────────────────────────────────

function ManualCaseDialog({ open, onOpenChange, vendors, onSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendors: any[];
  onSuccess: () => void;
}) {
  const [vendorId, setVendorId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("high");
  const [deadlineHours, setDeadlineHours] = useState(48);

  const createCase = trpc.escalation.cases.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Escalation ${data.caseRef} created`);
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Manual Escalation</DialogTitle>
          <DialogDescription>
            Manually escalate an issue to a vendor. Mia will generate the inquiry.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Vendor</Label>
            <Select value={vendorId} onValueChange={setVendorId}>
              <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
              <SelectContent>
                {vendors.map((v: any) => (
                  <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Accuracy below SLA for 3 consecutive days" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the issue..." rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Response Deadline (hours)</Label>
              <Input type="number" value={deadlineHours} onChange={e => setDeadlineHours(parseInt(e.target.value) || 48)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!vendorId) { toast.error("Select a vendor"); return; }
              if (!title.trim()) { toast.error("Title is required"); return; }
              createCase.mutate({
                vendorId: parseInt(vendorId),
                title: title.trim(),
                description: description.trim() || undefined,
                severity: severity as any,
                responseDeadlineHours: deadlineHours,
              });
            }}
            disabled={createCase.isPending}
          >
            {createCase.isPending ? "Creating..." : "Create Escalation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Security Panel ───────────────────────────────────────────────────────

function SecurityPanel({ vendors }: { vendors: any[] }) {
  const [showTokenDialog, setShowTokenDialog] = useState(false);
  const { data: tokens = [], refetch: refetchTokens } = trpc.escalation.tokens.list.useQuery({});
  const { data: auditLog = [] } = trpc.escalation.auditLog.list.useQuery({ limit: 20 });

  const revokeToken = trpc.escalation.tokens.revoke.useMutation({
    onSuccess: () => { toast.success("Token revoked"); refetchTokens(); },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      {/* Portal Tokens */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" /> Vendor Portal Tokens
          </h3>
          <Button size="sm" onClick={() => setShowTokenDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Generate Token
          </Button>
        </div>

        {tokens.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Shield className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-muted-foreground text-sm">No portal tokens generated yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {tokens.map((t: any) => {
              const isExpired = new Date() > new Date(t.expiresAt);
              return (
                <Card key={t.id} className={t.isRevoked || isExpired ? "opacity-60" : ""}>
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">
                          {t.label || `Token ...${t.tokenSuffix}`}
                          {t.isRevoked && <Badge variant="destructive" className="ml-2 text-xs">Revoked</Badge>}
                          {isExpired && !t.isRevoked && <Badge variant="secondary" className="ml-2 text-xs">Expired</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Vendor: {vendors.find((v: any) => v.id === t.vendorId)?.name || `#${t.vendorId}`}
                          {" · "}Suffix: ...{t.tokenSuffix}
                          {" · "}Expires: {new Date(t.expiresAt).toLocaleDateString()}
                          {" · "}Used: {t.accessCount}x
                          {t.ipAllowlist && (t.ipAllowlist as string[]).length > 0 && (
                            <span className="ml-1">· IP restricted</span>
                          )}
                        </div>
                      </div>
                      {!t.isRevoked && !isExpired && (
                        <Button
                          variant="outline" size="sm"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => { if (confirm("Revoke this token?")) revokeToken.mutate({ id: t.id }); }}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Audit Log */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <Activity className="h-5 w-5" /> Security Audit Log
        </h3>
        {auditLog.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground text-sm">No audit events recorded yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">
            {auditLog.map((entry: any) => (
              <div key={entry.id} className={`flex items-start gap-3 p-2 rounded text-sm ${entry.isSecurityEvent ? "bg-red-50 border border-red-100" : "bg-muted/30"}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${entry.isSecurityEvent ? "bg-red-500" : "bg-blue-400"}`} />
                <div className="min-w-0">
                  <div className="font-medium">{entry.eventCategory.replace(/_/g, " ")}</div>
                  <div className="text-xs text-muted-foreground truncate">{entry.details}</div>
                  <div className="text-xs text-muted-foreground">
                    {entry.ipAddress && `IP: ${entry.ipAddress} · `}
                    {new Date(entry.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Token Generation Dialog */}
      <TokenDialog
        open={showTokenDialog}
        onOpenChange={setShowTokenDialog}
        vendors={vendors}
        onSuccess={() => { refetchTokens(); setShowTokenDialog(false); }}
      />
    </div>
  );
}

// ─── Token Generation Dialog ──────────────────────────────────────────────

function TokenDialog({ open, onOpenChange, vendors, onSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendors: any[];
  onSuccess: () => void;
}) {
  const [vendorId, setVendorId] = useState<string>("");
  const [label, setLabel] = useState("");
  const [expiryDays, setExpiryDays] = useState(90);
  const [ipAllowlist, setIpAllowlist] = useState("");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  const createToken = trpc.escalation.tokens.create.useMutation({
    onSuccess: (data) => {
      setGeneratedToken(data.rawToken);
      toast.success("Token generated — copy it now, it won't be shown again.");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setGeneratedToken(null);
      setVendorId("");
      setLabel("");
      setExpiryDays(90);
      setIpAllowlist("");
      if (generatedToken) onSuccess();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Vendor Portal Token</DialogTitle>
          <DialogDescription>
            Create a secure access token for a vendor to access their escalation portal.
          </DialogDescription>
        </DialogHeader>

        {generatedToken ? (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-sm font-semibold text-amber-800 mb-2">
                Copy this token now — it will not be shown again.
              </p>
              <div className="font-mono text-xs bg-white p-3 rounded border break-all select-all">
                {generatedToken}
              </div>
            </div>
            <Button
              className="w-full"
              onClick={() => {
                navigator.clipboard.writeText(generatedToken);
                toast.success("Token copied to clipboard");
              }}
            >
              Copy Token
            </Button>
            <p className="text-xs text-muted-foreground">
              Share this token securely with the vendor. They will use it to access their escalation portal.
              The portal URL will be: <code>/vendor-portal?token=TOKEN</code>
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <Label>Vendor</Label>
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendors.map((v: any) => (
                      <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Label (optional)</Label>
                <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g., Acme Corp Q1 2026 access" />
              </div>
              <div>
                <Label>Expiry (days)</Label>
                <Input type="number" value={expiryDays} onChange={e => setExpiryDays(parseInt(e.target.value) || 90)} />
              </div>
              <div>
                <Label>IP Allowlist (optional, comma-separated)</Label>
                <Input value={ipAllowlist} onChange={e => setIpAllowlist(e.target.value)} placeholder="e.g., 203.0.113.0/24, 198.51.100.5" />
                <p className="text-xs text-muted-foreground mt-1">
                  Restrict portal access to specific IP addresses or CIDR ranges. Leave empty for no restriction.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (!vendorId) { toast.error("Select a vendor"); return; }
                  const ips = ipAllowlist.split(",").map(s => s.trim()).filter(Boolean);
                  createToken.mutate({
                    vendorId: parseInt(vendorId),
                    label: label.trim() || undefined,
                    expiryDays,
                    ipAllowlist: ips.length > 0 ? ips : undefined,
                  });
                }}
                disabled={createToken.isPending}
              >
                {createToken.isPending ? "Generating..." : "Generate Token"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
