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
import { Building2, Plus, Search, MapPin } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function Vendors() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const vendors = trpc.vendors.list.useQuery();
  const utils = trpc.useUtils();

  const createVendor = trpc.vendors.create.useMutation({
    onSuccess: () => { utils.vendors.list.invalidate(); setDialogOpen(false); toast.success("Vendor created"); },
    onError: (err) => toast.error(err.message),
  });

  const [form, setForm] = useState({
    name: "", region: "", contactName: "", contactEmail: "",
    contractStatus: "active" as const, headcount: 0,
    slaAccuracyTarget: 95, slaThroughputTarget: 100, slaResponseTimeTarget: 24, notes: "",
  });

  const handleCreate = () => {
    if (!form.name.trim()) { toast.error("Vendor name is required"); return; }
    createVendor.mutate(form);
  };

  const filtered = vendors.data?.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) || (v.region || "").toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-primary/5 via-card to-chart-1/5 rounded-2xl border border-border/40 p-6">
        <MiaGreeting userName={user?.name || undefined} greeting="Vendor Management" subtitle={vendors.data?.length ? `You have ${vendors.data.length} vendor${vendors.data.length > 1 ? "s" : ""} in your portfolio. Click any vendor card to view detailed performance metrics and management options.` : "Let's set up your vendor portfolio. Add your first vendor to start tracking performance."} mood="neutral" />
      </motion.div>

      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Add Vendor</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><MiaAvatar mood="speaking" size="sm" showGlow={false} />Add New Vendor</DialogTitle>
              <DialogDescription>I'll help you set up a new vendor profile with SLA targets.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Vendor Name *</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Acme Corp" /></div>
                <div className="space-y-2"><Label>Region</Label><Input value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))} placeholder="APAC" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Contact Name</Label><Input value={form.contactName} onChange={e => setForm(p => ({ ...p, contactName: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Contact Email</Label><Input value={form.contactEmail} onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))} type="email" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Contract Status</Label>
                  <Select value={form.contractStatus} onValueChange={v => setForm(p => ({ ...p, contractStatus: v as any }))}><SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="terminated">Terminated</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Headcount</Label><Input type="number" value={form.headcount} onChange={e => setForm(p => ({ ...p, headcount: parseInt(e.target.value) || 0 }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Accuracy Target (%)</Label><Input type="number" value={form.slaAccuracyTarget} onChange={e => setForm(p => ({ ...p, slaAccuracyTarget: parseFloat(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><Label>Throughput Target</Label><Input type="number" value={form.slaThroughputTarget} onChange={e => setForm(p => ({ ...p, slaThroughputTarget: parseFloat(e.target.value) || 0 }))} /></div>
                <div className="space-y-2"><Label>Response Time (hrs)</Label><Input type="number" value={form.slaResponseTimeTarget} onChange={e => setForm(p => ({ ...p, slaResponseTimeTarget: parseFloat(e.target.value) || 0 }))} /></div>
              </div>
              <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} /></div>
              <Button onClick={handleCreate} disabled={createVendor.isPending} className="w-full">{createVendor.isPending ? "Creating..." : "Create Vendor"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {vendors.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}</div>
      ) : !filtered.length ? (
        <Card className="border-dashed border-border/40">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MiaAvatar mood="neutral" size="lg" />
            <p className="text-sm text-muted-foreground mt-4">{search ? "No vendors match your search." : "No vendors added yet. Let's get started."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((vendor, i) => (
            <motion.div key={vendor.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="cursor-pointer hover:shadow-md transition-all border-border/40" onClick={() => setLocation(`/vendors/${vendor.id}`)}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0"><h3 className="font-semibold truncate">{vendor.name}</h3>
                      {vendor.region && <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{vendor.region}</div>}
                    </div>
                    <Badge variant={vendor.contractStatus === "active" ? "default" : "secondary"} className="text-[10px] shrink-0">{vendor.contractStatus}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t">
                    <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Headcount</p><p className="text-sm font-semibold mt-0.5">{vendor.headcount || 0}</p></div>
                    <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Accuracy</p><p className="text-sm font-semibold mt-0.5">{vendor.slaAccuracyTarget}%</p></div>
                    <div><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Throughput</p><p className="text-sm font-semibold mt-0.5">{vendor.slaThroughputTarget}/hr</p></div>
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
