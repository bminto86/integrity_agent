import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
import { Streamdown } from "streamdown";
import {
  ArrowLeft, AlertTriangle, Clock, MessageSquare, Brain,
  CheckCircle, FileText, Send, ChevronDown, Shield, User, Bot,
  Zap, Eye,
} from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
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

const TIMELINE_ICONS: Record<string, any> = {
  case_created: Zap,
  inquiry_sent: Send,
  vendor_viewed: Eye,
  vendor_responded: MessageSquare,
  follow_up_sent: Clock,
  severity_escalated: AlertTriangle,
  mia_analysis: Brain,
  status_changed: CheckCircle,
  resolution_verified: Shield,
  note_added: FileText,
  token_accessed: Shield,
};

export default function EscalationDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const caseId = parseInt(params.id || "0");
  const [note, setNote] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const { data: caseData, refetch: refetchCase } = trpc.escalation.cases.get.useQuery(
    { id: caseId },
    { enabled: caseId > 0 }
  );
  const { data: timeline = [], refetch: refetchTimeline } = trpc.escalation.cases.timeline.useQuery(
    { caseId },
    { enabled: caseId > 0 }
  );
  const { data: responses = [], refetch: refetchResponses } = trpc.escalation.cases.responses.useQuery(
    { caseId },
    { enabled: caseId > 0 }
  );
  const { data: vendors = [] } = trpc.vendors.list.useQuery();

  const analyze = trpc.escalation.cases.analyze.useMutation({
    onSuccess: () => {
      toast.success("Mia analysis complete");
      refetchCase();
      refetchTimeline();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStatus = trpc.escalation.cases.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      refetchCase();
      refetchTimeline();
    },
    onError: (err) => toast.error(err.message),
  });

  const addNote = trpc.escalation.cases.addNote.useMutation({
    onSuccess: () => {
      toast.success("Note added");
      setNote("");
      refetchTimeline();
    },
    onError: (err) => toast.error(err.message),
  });

  if (!caseData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-muted-foreground">Loading case...</p>
        </div>
      </div>
    );
  }

  const vendor = vendors.find((v: any) => v.id === caseData.vendorId);
  const isActive = !["resolved", "closed"].includes(caseData.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/escalations")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{caseData.caseRef}</h1>
            <Badge className={SEVERITY_COLORS[caseData.severity] || ""}>{caseData.severity}</Badge>
            <Badge className={STATUS_COLORS[caseData.status] || ""}>{caseData.status.replace(/_/g, " ")}</Badge>
          </div>
          <p className="text-muted-foreground">{caseData.title}</p>
          <p className="text-sm text-muted-foreground">
            Vendor: <strong>{vendor?.name || `#${caseData.vendorId}`}</strong>
            {caseData.responseDeadline && (
              <span className="ml-3">
                <Clock className="h-3 w-3 inline mr-1" />
                Deadline: {new Date(caseData.responseDeadline).toLocaleString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {isActive && (
            <Button
              variant="outline"
              onClick={() => analyze.mutate({ id: caseId })}
              disabled={analyze.isPending}
            >
              <Brain className="h-4 w-4 mr-2" />
              {analyze.isPending ? "Analysing..." : "Mia Analyse"}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">
            Timeline ({timeline.length})
          </TabsTrigger>
          <TabsTrigger value="responses">
            Responses ({responses.length})
          </TabsTrigger>
          <TabsTrigger value="analysis">Mia Analysis</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          {/* Inquiry */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4" /> Escalation Inquiry
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                <Streamdown>{String(caseData.inquiryContent || "No inquiry generated.")}</Streamdown>
              </div>
            </CardContent>
          </Card>

          {/* Trigger Data */}
          {Array.isArray(caseData.triggerData) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Trigger Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {(caseData.triggerData as any[]).map((t: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 border">
                      <div className="text-xs text-muted-foreground">{t.metric}</div>
                      <div className="text-lg font-bold text-red-600">{t.actual}</div>
                      <div className="text-xs text-muted-foreground">
                        Threshold: {t.operator} {t.threshold}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Update & Notes */}
          {isActive && (
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Update Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger><SelectValue placeholder="Select new status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="awaiting_vendor">Awaiting Vendor</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  {(newStatus === "resolved" || newStatus === "closed") && (
                    <div>
                      <Label>Resolution Notes</Label>
                      <Textarea
                        value={resolutionNotes}
                        onChange={e => setResolutionNotes(e.target.value)}
                        placeholder="Describe the resolution..."
                        rows={3}
                      />
                    </div>
                  )}
                  <Button
                    size="sm"
                    disabled={!newStatus || updateStatus.isPending}
                    onClick={() => {
                      updateStatus.mutate({
                        id: caseId,
                        status: newStatus as any,
                        resolutionNotes: resolutionNotes || undefined,
                      });
                    }}
                  >
                    Update Status
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Add Note</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Add an internal note to the case timeline..."
                    rows={4}
                  />
                  <Button
                    size="sm"
                    disabled={!note.trim() || addNote.isPending}
                    onClick={() => addNote.mutate({ id: caseId, note: note.trim() })}
                  >
                    Add Note
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline">
          <Card>
            <CardContent className="py-4">
              {timeline.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No timeline events yet.</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                  <div className="space-y-4">
                    {timeline.map((entry: any) => {
                      const Icon = TIMELINE_ICONS[entry.eventType] || FileText;
                      const actorColors: Record<string, string> = {
                        system: "bg-gray-100 text-gray-600",
                        user: "bg-blue-100 text-blue-600",
                        vendor: "bg-amber-100 text-amber-600",
                        mia: "bg-purple-100 text-purple-600",
                      };
                      return (
                        <div key={entry.id} className="relative pl-10">
                          <div className={`absolute left-2 w-5 h-5 rounded-full flex items-center justify-center ${actorColors[entry.actor] || "bg-gray-100"}`}>
                            <Icon className="h-3 w-3" />
                          </div>
                          <div className="p-3 rounded-lg border bg-card">
                            <div className="flex items-center justify-between mb-1">
                              <div className="font-medium text-sm">{entry.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(entry.createdAt).toLocaleString()}
                              </div>
                            </div>
                            {entry.content && (
                              <div className="text-sm text-muted-foreground prose prose-sm max-w-none">
                                <Streamdown>{String(entry.content || "")}</Streamdown>
                              </div>
                            )}
                            <Badge variant="outline" className="mt-1 text-xs">{entry.actor}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Responses */}
        <TabsContent value="responses" className="space-y-4">
          {responses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-muted-foreground">No vendor responses yet.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  The vendor will respond through their portal when they receive the escalation.
                </p>
              </CardContent>
            </Card>
          ) : (
            responses.map((resp: any) => (
              <Card key={resp.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Vendor Response
                      {resp.isAiAssisted && (
                        <Badge variant="secondary" className="text-xs">
                          <Bot className="h-3 w-3 mr-1" /> AI-Assisted
                        </Badge>
                      )}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {new Date(resp.createdAt).toLocaleString()}
                      {resp.submitterIp && ` · IP: ${resp.submitterIp}`}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Root Cause Analysis</Label>
                    <div className="mt-1 p-3 rounded bg-muted/30 text-sm">{resp.rootCause}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Remediation Plan</Label>
                    <div className="mt-1 p-3 rounded bg-muted/30 text-sm">{resp.remediationPlan}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Timeline</Label>
                      <div className="mt-1 p-3 rounded bg-muted/30 text-sm">{resp.timeline}</div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Prevention Measures</Label>
                      <div className="mt-1 p-3 rounded bg-muted/30 text-sm">{resp.preventionMeasures || "Not provided"}</div>
                    </div>
                  </div>
                  {resp.additionalNotes && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Additional Notes</Label>
                      <div className="mt-1 p-3 rounded bg-muted/30 text-sm">{resp.additionalNotes}</div>
                    </div>
                  )}
                  {resp.miaResponseAnalysis && (
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                      <Label className="text-xs text-purple-700 flex items-center gap-1">
                        <Brain className="h-3 w-3" /> Mia's Analysis of This Response
                      </Label>
                      <div className="mt-1 text-sm prose prose-sm max-w-none">
                        <Streamdown>{String(resp.miaResponseAnalysis || "")}</Streamdown>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Mia Analysis */}
        <TabsContent value="analysis">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-600" /> Mia's Case Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {caseData.miaAnalysis ? (
                <div className="prose prose-sm max-w-none">
                  <Streamdown>{String(caseData.miaAnalysis || "")}</Streamdown>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Brain className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-muted-foreground">No analysis yet.</p>
                  <Button
                    variant="outline" className="mt-3"
                    onClick={() => analyze.mutate({ id: caseId })}
                    disabled={analyze.isPending}
                  >
                    {analyze.isPending ? "Analysing..." : "Run Mia Analysis"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
