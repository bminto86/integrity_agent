import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Plus, Search, MapPin, Users as UsersIcon } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Vendors() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const vendors = trpc.vendors.list.useQuery();
  const utils = trpc.useUtils();

  const createVendor = trpc.vendors.create.useMutation({
    onSuccess: () => {
      utils.vendors.list.invalidate();
      setDialogOpen(false);
      toast.success("Vendor created successfully");
    },
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
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.region || "").toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your scaled review workforce vendors.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Add Vendor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Vendor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vendor Name *</Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Acme Corp" />
                </div>
                <div className="space-y-2">
                  <Label>Region</Label>
                  <Input value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))} placeholder="APAC" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Name</Label>
                  <Input value={form.contactName} onChange={e => setForm(p => ({ ...p, contactName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Contact Email</Label>
                  <Input value={form.contactEmail} onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))} type="email" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contract Status</Label>
                  <Select value={form.contractStatus} onValueChange={v => setForm(p => ({ ...p, contractStatus: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="terminated">Terminated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Headcount</Label>
                  <Input type="number" value={form.headcount} onChange={e => setForm(p => ({ ...p, headcount: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Accuracy Target (%)</Label>
                  <Input type="number" value={form.slaAccuracyTarget} onChange={e => setForm(p => ({ ...p, slaAccuracyTarget: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Throughput Target</Label>
                  <Input type="number" value={form.slaThroughputTarget} onChange={e => setForm(p => ({ ...p, slaThroughputTarget: parseFloat(e.target.value) || 0 }))} />
                </div>
                <div className="space-y-2">
                  <Label>Response Time (hrs)</Label>
                  <Input type="number" value={form.slaResponseTimeTarget} onChange={e => setForm(p => ({ ...p, slaResponseTimeTarget: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} />
              </div>
              <Button onClick={handleCreate} disabled={createVendor.isPending} className="w-full">
                {createVendor.isPending ? "Creating..." : "Create Vendor"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {vendors.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : !filtered.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">{search ? "No vendors match your search" : "No vendors added yet"}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(vendor => (
            <Card
              key={vendor.id}
              className="cursor-pointer hover:shadow-md transition-all border-border/50"
              onClick={() => setLocation(`/vendors/${vendor.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{vendor.name}</h3>
                    {vendor.region && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />{vendor.region}
                      </div>
                    )}
                  </div>
                  <Badge variant={vendor.contractStatus === "active" ? "default" : "secondary"} className="text-[10px] shrink-0">
                    {vendor.contractStatus}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Headcount</p>
                    <p className="text-sm font-semibold mt-0.5">{vendor.headcount || 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Accuracy</p>
                    <p className="text-sm font-semibold mt-0.5">{vendor.slaAccuracyTarget}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Throughput</p>
                    <p className="text-sm font-semibold mt-0.5">{vendor.slaThroughputTarget}/hr</p>
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
