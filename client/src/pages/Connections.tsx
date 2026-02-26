import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MiaGreeting, MiaInsight, MiaSection, MiaAvatar } from "@/components/Mia";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Upload, Database, Globe, FileSpreadsheet, Link2, Lock,
  CheckCircle2, XCircle, Clock, ArrowRight, Info, Zap,
  MessageSquare, BarChart3, Users, Shield, Webhook,
} from "lucide-react";

// ─── Connection definitions (future integrations) ────────────────────────
interface ConnectionDef {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: "data_source" | "communication" | "analytics" | "automation";
  status: "available" | "coming_soon" | "connected";
  fields?: Array<{ key: string; label: string; type: "text" | "password" | "url"; placeholder: string }>;
}

const connections: ConnectionDef[] = [
  {
    id: "csv_import",
    name: "CSV / Excel Import",
    description: "Bulk import vendor metrics, tasks, and workforce data from spreadsheets.",
    icon: FileSpreadsheet,
    category: "data_source",
    status: "available",
  },
  {
    id: "vendor_api",
    name: "Vendor Performance API",
    description: "Connect to your vendor's reporting API for real-time metric ingestion.",
    icon: Database,
    category: "data_source",
    status: "coming_soon",
    fields: [
      { key: "api_url", label: "API Endpoint", type: "url", placeholder: "https://api.vendor.com/v1/metrics" },
      { key: "api_key", label: "API Key", type: "password", placeholder: "Enter API key" },
    ],
  },
  {
    id: "ticketing_system",
    name: "Ticketing System",
    description: "Sync tasks and action items with Jira, Asana, or ServiceNow.",
    icon: CheckCircle2,
    category: "automation",
    status: "coming_soon",
    fields: [
      { key: "platform", label: "Platform", type: "text", placeholder: "jira / asana / servicenow" },
      { key: "api_url", label: "Instance URL", type: "url", placeholder: "https://your-org.atlassian.net" },
      { key: "api_key", label: "API Token", type: "password", placeholder: "Enter token" },
    ],
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send alerts, reports, and Mia insights directly to Slack channels.",
    icon: MessageSquare,
    category: "communication",
    status: "coming_soon",
    fields: [
      { key: "webhook_url", label: "Webhook URL", type: "url", placeholder: "https://hooks.slack.com/services/..." },
    ],
  },
  {
    id: "email_integration",
    name: "Email (SMTP)",
    description: "Send drafted communications and reports via your organization's email.",
    icon: Globe,
    category: "communication",
    status: "coming_soon",
    fields: [
      { key: "smtp_host", label: "SMTP Host", type: "text", placeholder: "smtp.office365.com" },
      { key: "smtp_user", label: "Username", type: "text", placeholder: "user@company.com" },
      { key: "smtp_pass", label: "Password", type: "password", placeholder: "Enter password" },
    ],
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    description: "Interact with Mia via WhatsApp for on-the-go operations management.",
    icon: MessageSquare,
    category: "communication",
    status: "coming_soon",
  },
  {
    id: "bi_dashboard",
    name: "BI Dashboard (Looker / Tableau)",
    description: "Pull metrics from your existing BI dashboards for automated reporting.",
    icon: BarChart3,
    category: "analytics",
    status: "coming_soon",
    fields: [
      { key: "platform", label: "Platform", type: "text", placeholder: "looker / tableau / powerbi" },
      { key: "api_url", label: "API URL", type: "url", placeholder: "https://looker.company.com/api/3.1" },
      { key: "api_key", label: "API Key", type: "password", placeholder: "Enter key" },
    ],
  },
  {
    id: "webhook",
    name: "Custom Webhook",
    description: "Receive data from any system via webhook for custom integrations.",
    icon: Webhook,
    category: "automation",
    status: "coming_soon",
  },
];

const categoryLabels: Record<string, string> = {
  data_source: "Data Sources",
  communication: "Communication",
  analytics: "Analytics",
  automation: "Automation",
};

const categoryIcons: Record<string, React.ElementType> = {
  data_source: Database,
  communication: MessageSquare,
  analytics: BarChart3,
  automation: Zap,
};

// ─── CSV Import Dialog ───────────────────────────────────────────────────
function CSVImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [importType, setImportType] = useState("vendor_metrics");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][] | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const importVendorMetrics = trpc.metrics.bulkImport.useMutation({
    onSuccess: (data) => {
      toast.success(`Imported ${data.count} metric records successfully`);
      onOpenChange(false);
      setFile(null);
      setPreview(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    // Parse preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").filter(l => l.trim());
      const rows = lines.slice(0, 6).map(l => l.split(",").map(c => c.trim().replace(/^"|"$/g, "")));
      setPreview(rows);
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      if (lines.length < 2) {
        toast.error("CSV must have a header row and at least one data row");
        return;
      }
      const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, "").toLowerCase());
      const records = lines.slice(1).map(line => {
        const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => { obj[h] = cols[i] || ""; });
        return obj;
      });

      if (importType === "vendor_metrics") {
        // Expect: vendorId, date, accuracyRate, throughput, responseTime, qualityScore
        const metrics = records.map(r => ({
          vendorId: parseInt(r.vendorid || r.vendor_id || "0"),
          date: r.date || new Date().toISOString().split("T")[0],
          accuracyRate: r.accuracyrate || r.accuracy_rate || r.accuracy || undefined,
          throughput: r.throughput ? parseInt(r.throughput) : undefined,
          responseTime: r.responsetime || r.response_time || undefined,
          qualityScore: r.qualityscore || r.quality_score || undefined,
        })).filter(m => m.vendorId > 0);

        if (metrics.length === 0) {
          toast.error("No valid records found. Ensure CSV has vendorId column.");
          return;
        }
        await importVendorMetrics.mutateAsync({ metrics });
      } else {
        toast.info("This import type is coming soon. Currently only vendor metrics import is supported.");
      }
    } catch (err) {
      toast.error("Failed to parse CSV file");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            CSV / Excel Import
          </DialogTitle>
          <DialogDescription>
            Import data from spreadsheets. Mia will validate and process the records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Import Type</Label>
            <Select value={importType} onValueChange={setImportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vendor_metrics">Vendor Metrics</SelectItem>
                <SelectItem value="tasks">Tasks (coming soon)</SelectItem>
                <SelectItem value="vendors">Vendors (coming soon)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {importType === "vendor_metrics" && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <MiaAvatar mood="speaking" size="sm" showGlow={false} />
              <div className="text-xs text-muted-foreground leading-relaxed">
                <p className="font-medium text-foreground mb-1">Expected CSV format:</p>
                <code className="text-[11px] bg-muted px-1.5 py-0.5 rounded">
                  vendorId, date, accuracyRate, throughput, responseTime, qualityScore
                </code>
                <p className="mt-1">Date format: YYYY-MM-DD. Rates as decimals (e.g., 0.95 for 95%). Throughput as integer.</p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Upload File</Label>
            <div
              className="border-2 border-dashed border-border/60 rounded-lg p-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{(file.size / 1024).toFixed(1)} KB</Badge>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">Click to select a CSV file</p>
                </div>
              )}
            </div>
          </div>

          {preview && (
            <div className="space-y-2">
              <Label>Preview (first 5 rows)</Label>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      {preview[0]?.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(1).map((row, ri) => (
                      <tr key={ri} className="border-t">
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-3 py-1.5 text-foreground">{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleImport} disabled={!file || importing}>
            {importing ? "Importing..." : "Import Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Connection Config Dialog (for future integrations) ──────────────────
function ConnectionConfigDialog({
  connection,
  open,
  onOpenChange,
}: {
  connection: ConnectionDef | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!connection) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <connection.icon className="h-5 w-5 text-primary" />
            {connection.name}
          </DialogTitle>
          <DialogDescription>{connection.description}</DialogDescription>
        </DialogHeader>

        {connection.status === "coming_soon" ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-chart-4/5 border border-chart-4/20">
              <MiaAvatar mood="speaking" size="sm" showGlow={false} />
              <div className="text-sm text-muted-foreground leading-relaxed">
                <p className="font-medium text-foreground mb-1">This integration is on the roadmap</p>
                <p>I'm being built to support this connection. When it's ready, you'll be able to configure it right here and I'll start pulling data automatically.</p>
              </div>
            </div>

            {connection.fields && (
              <div className="space-y-3 opacity-50 pointer-events-none">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Configuration Preview</p>
                {connection.fields.map(field => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs">{field.label}</Label>
                    <Input type={field.type} placeholder={field.placeholder} disabled />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {connection.status === "coming_soon" && (
            <Button disabled>
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              Coming Soon
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Connections Page ────────────────────────────────────────────────
export default function Connections() {
  const { user } = useAuth();
  const [csvOpen, setCsvOpen] = useState(false);
  const [configConn, setConfigConn] = useState<ConnectionDef | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  const categories = ["data_source", "communication", "analytics", "automation"] as const;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* ─── Mia Header ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary/5 via-card to-chart-4/5 rounded-2xl border border-border/40 p-6"
      >
        <MiaGreeting
          userName={user?.name || undefined}
          greeting="Data Connections & Integrations"
          subtitle="This is where you'll connect me to your data sources. Right now, CSV import is live — more integrations are being built. When they're ready, just flip the switch."
          mood="speaking"
        />
      </motion.div>

      {/* ─── Active Connection: CSV Import ─────────────────────────────── */}
      <MiaSection
        title="Ready to Use"
        description="These integrations are live and ready for your data."
        mood="speaking"
      >
        <Card
          className="border-border/40 hover:border-primary/20 hover:shadow-md transition-all cursor-pointer"
          onClick={() => setCsvOpen(true)}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">CSV / Excel Import</h3>
                  <Badge className="bg-success/15 text-success border-success/20 text-[10px]">Active</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Bulk import vendor metrics, tasks, and workforce data from spreadsheets.
                </p>
              </div>
              <Button variant="outline" size="sm">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Import
              </Button>
            </div>
          </CardContent>
        </Card>
      </MiaSection>

      {/* ─── Future Integrations by Category ───────────────────────────── */}
      {categories.filter(c => c !== "data_source" || connections.filter(cn => cn.category === c && cn.id !== "csv_import").length > 0).map(category => {
        const catConnections = connections.filter(c => c.category === category && c.id !== "csv_import");
        if (catConnections.length === 0) return null;
        const CatIcon = categoryIcons[category];

        return (
          <motion.div
            key={category}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <MiaSection
              title={categoryLabels[category]}
              mood="neutral"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {catConnections.map((conn, i) => (
                  <motion.div
                    key={conn.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                  >
                    <Card
                      className="border-border/40 hover:border-border/60 transition-all cursor-pointer group"
                      onClick={() => { setConfigConn(conn); setConfigOpen(true); }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-muted/60 flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                            <conn.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-medium">{conn.name}</h3>
                              <Badge variant="secondary" className="text-[10px]">
                                <Clock className="h-2.5 w-2.5 mr-1" />
                                Coming Soon
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{conn.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </MiaSection>
          </motion.div>
        );
      })}

      {/* ─── Mia's note about future connections ───────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        <MiaInsight
          title="More integrations on the way"
          content="As new connections become available, they'll appear here with a simple toggle to activate. Your data stays in your control — I only access what you connect."
          type="info"
        />
      </motion.div>

      {/* ─── Dialogs ───────────────────────────────────────────────────── */}
      <CSVImportDialog open={csvOpen} onOpenChange={setCsvOpen} />
      <ConnectionConfigDialog connection={configConn} open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}
