import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
  Shield, Lock, AlertTriangle, Clock, Send, Bot,
  CheckCircle, ArrowLeft, FileText, Loader2,
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

export default function VendorPortal() {
  const [token, setToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [vendorData, setVendorData] = useState<any>(null);
  const [selectedCase, setSelectedCase] = useState<number | null>(null);
  const [tokenInput, setTokenInput] = useState("");

  // Check URL params for token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get("token");
    if (urlToken) {
      setTokenInput(urlToken);
    }
  }, []);

  const authenticate = trpc.escalation.portal.authenticate.useMutation({
    onSuccess: (data) => {
      setVendorData(data);
      setIsAuthenticated(true);
      toast.success(`Welcome, ${data.vendorName}`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleAuth = () => {
    if (!tokenInput.trim()) {
      toast.error("Please enter your access token.");
      return;
    }
    setToken(tokenInput.trim());
    authenticate.mutate({ token: tokenInput.trim() });
  };

  // Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Vendor Escalation Portal</CardTitle>
            <CardDescription>
              Enter your secure access token to view and respond to escalation cases.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Access Token</Label>
              <Input
                type="password"
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                placeholder="Paste your access token here"
                onKeyDown={e => { if (e.key === "Enter") handleAuth(); }}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleAuth}
              disabled={authenticate.isPending}
            >
              {authenticate.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Authenticating...</>
              ) : (
                <><Lock className="h-4 w-4 mr-2" /> Access Portal</>
              )}
            </Button>
            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>Your token was provided by the operations team.</p>
              <p className="flex items-center justify-center gap-1">
                <Shield className="h-3 w-3" />
                Secure, encrypted access — all activity is logged.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Authenticated: Case List or Case Detail
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <h1 className="font-semibold">Vendor Escalation Portal</h1>
              <p className="text-xs text-muted-foreground">
                {vendorData?.vendorName} · Token: ...{vendorData?.tokenSuffix}
              </p>
            </div>
          </div>
          <Button
            variant="outline" size="sm"
            onClick={() => {
              setIsAuthenticated(false);
              setVendorData(null);
              setToken("");
              setTokenInput("");
              setSelectedCase(null);
            }}
          >
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {selectedCase ? (
          <VendorCaseDetail
            token={token}
            caseId={selectedCase}
            onBack={() => setSelectedCase(null)}
          />
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Your Escalation Cases</h2>
            {vendorData?.cases?.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-10 w-10 mx-auto text-green-400 mb-2" />
                  <p className="text-muted-foreground">No active escalation cases.</p>
                </CardContent>
              </Card>
            ) : (
              vendorData?.cases?.map((c: any) => (
                <Card
                  key={c.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedCase(c.id)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge className={SEVERITY_COLORS[c.severity] || ""}>{c.severity}</Badge>
                          <span className="font-medium">{c.caseRef}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">{c.title}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <Badge className={STATUS_COLORS[c.status] || ""} variant="outline">
                            {c.status.replace(/_/g, " ")}
                          </Badge>
                          {c.responseDeadline && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Deadline: {new Date(c.responseDeadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowLeft className="h-4 w-4 text-muted-foreground rotate-180" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Vendor Case Detail ───────────────────────────────────────────────────

function VendorCaseDetail({ token, caseId, onBack }: {
  token: string;
  caseId: number;
  onBack: () => void;
}) {
  const { data: caseData, isLoading } = trpc.escalation.portal.getCase.useQuery(
    { token, caseId },
    { enabled: !!token && caseId > 0 }
  );

  const [rootCause, setRootCause] = useState("");
  const [remediationPlan, setRemediationPlan] = useState("");
  const [timeline, setTimeline] = useState("");
  const [preventionMeasures, setPreventionMeasures] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [vendorContext, setVendorContext] = useState("");
  const [isAiAssisted, setIsAiAssisted] = useState(false);

  const submitResponse = trpc.escalation.portal.submitResponse.useMutation({
    onSuccess: () => {
      toast.success("Response submitted successfully. The operations team will review it.");
      setRootCause("");
      setRemediationPlan("");
      setTimeline("");
      setPreventionMeasures("");
      setAdditionalNotes("");
    },
    onError: (err) => toast.error(err.message),
  });

  const aiSuggest = trpc.escalation.portal.aiSuggest.useMutation({
    onSuccess: (data) => {
      if (data.rootCause) setRootCause(data.rootCause);
      if (data.remediationPlan) setRemediationPlan(data.remediationPlan);
      if (data.timeline) setTimeline(data.timeline);
      if (data.preventionMeasures) setPreventionMeasures(data.preventionMeasures);
      setIsAiAssisted(true);
      toast.success("AI draft generated — review and edit before submitting.");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto text-red-400 mb-2" />
          <p className="text-muted-foreground">Case not found or access denied.</p>
          <Button variant="outline" className="mt-3" onClick={onBack}>Go Back</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold">{caseData.caseRef}</h2>
            <Badge className={SEVERITY_COLORS[caseData.severity] || ""}>{caseData.severity}</Badge>
            <Badge className={STATUS_COLORS[caseData.status] || ""}>{caseData.status.replace(/_/g, " ")}</Badge>
          </div>
          <p className="text-muted-foreground">{caseData.title}</p>
        </div>
      </div>

      {/* Inquiry */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Escalation Inquiry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm max-w-none">
            <Streamdown>{String(caseData.inquiryContent || "No inquiry content.")}</Streamdown>
          </div>
          {caseData.responseDeadline && (
            <div className="mt-3 p-2 rounded bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Response Deadline: <strong>{new Date(caseData.responseDeadline).toLocaleString()}</strong>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Previous Responses */}
      {caseData.responses && caseData.responses.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Previous Responses ({caseData.responses.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {caseData.responses.map((r: any) => (
              <div key={r.id} className="p-3 rounded border bg-muted/30">
                <div className="text-xs text-muted-foreground mb-1">
                  Submitted {new Date(r.createdAt).toLocaleString()}
                  {r.isAiAssisted && <Badge variant="secondary" className="ml-2 text-xs"><Bot className="h-3 w-3 mr-1" />AI-Assisted</Badge>}
                </div>
                <div className="text-sm"><strong>Root Cause:</strong> {r.rootCause}</div>
                <div className="text-sm"><strong>Remediation:</strong> {r.remediationPlan}</div>
                <div className="text-sm"><strong>Timeline:</strong> {r.timeline}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Response Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4" /> Submit Response
          </CardTitle>
          <CardDescription>
            Provide your root cause analysis, remediation plan, and timeline. You can use AI to help draft a response.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI Assist */}
          <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium text-purple-800">
                <Bot className="h-4 w-4" /> AI Response Assistant
              </div>
              <Button
                variant="outline" size="sm"
                className="text-purple-700 border-purple-200"
                onClick={() => aiSuggest.mutate({ token, caseId, vendorContext: vendorContext || undefined })}
                disabled={aiSuggest.isPending}
              >
                {aiSuggest.isPending ? (
                  <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Generating...</>
                ) : "Generate Draft"}
              </Button>
            </div>
            <div>
              <Label className="text-xs text-purple-700">Internal Context (optional, not shared)</Label>
              <Textarea
                value={vendorContext}
                onChange={e => setVendorContext(e.target.value)}
                placeholder="Add any internal context to help the AI generate a better response..."
                rows={2}
                className="mt-1 text-sm"
              />
            </div>
          </div>

          {/* Response Fields */}
          <div>
            <Label>Root Cause Analysis <span className="text-red-500">*</span></Label>
            <Textarea
              value={rootCause}
              onChange={e => setRootCause(e.target.value)}
              placeholder="What caused the issue? Be specific about the root cause..."
              rows={4}
            />
          </div>
          <div>
            <Label>Remediation Plan <span className="text-red-500">*</span></Label>
            <Textarea
              value={remediationPlan}
              onChange={e => setRemediationPlan(e.target.value)}
              placeholder="What steps are you taking to fix the issue?"
              rows={4}
            />
          </div>
          <div>
            <Label>Timeline for Resolution <span className="text-red-500">*</span></Label>
            <Input
              value={timeline}
              onChange={e => setTimeline(e.target.value)}
              placeholder="e.g., Full resolution within 5 business days"
            />
          </div>
          <div>
            <Label>Prevention Measures</Label>
            <Textarea
              value={preventionMeasures}
              onChange={e => setPreventionMeasures(e.target.value)}
              placeholder="What measures will prevent this from recurring?"
              rows={3}
            />
          </div>
          <div>
            <Label>Additional Notes</Label>
            <Textarea
              value={additionalNotes}
              onChange={e => setAdditionalNotes(e.target.value)}
              placeholder="Any additional context or information..."
              rows={2}
            />
          </div>

          <Button
            className="w-full"
            onClick={() => {
              if (!rootCause.trim()) { toast.error("Root cause analysis is required."); return; }
              if (!remediationPlan.trim()) { toast.error("Remediation plan is required."); return; }
              if (!timeline.trim()) { toast.error("Timeline is required."); return; }
              submitResponse.mutate({
                token,
                caseId,
                rootCause: rootCause.trim(),
                remediationPlan: remediationPlan.trim(),
                timeline: timeline.trim(),
                preventionMeasures: preventionMeasures.trim() || undefined,
                additionalNotes: additionalNotes.trim() || undefined,
                isAiAssisted,
              });
            }}
            disabled={submitResponse.isPending}
          >
            {submitResponse.isPending ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
            ) : (
              <><Send className="h-4 w-4 mr-2" /> Submit Response</>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" />
            Your response is encrypted and logged. All activity is audited.
          </p>
        </CardContent>
      </Card>

      {/* Timeline */}
      {caseData.timeline && caseData.timeline.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Case Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {caseData.timeline.map((t: any, i: number) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(t.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
