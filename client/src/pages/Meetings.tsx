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
import { VoiceInputButton } from "@/components/VoiceButton";
import { MiaGreeting, MiaMessage, MiaAvatar } from "@/components/Mia";
import { Users, Plus, Sparkles, Loader2, Trash2, Eye, Calendar } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { motion } from "framer-motion";

export default function Meetings() {
  const { user } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [viewMeeting, setViewMeeting] = useState<any>(null);
  const meetings = trpc.meetings.list.useQuery();
  const vendors = trpc.vendors.list.useQuery();
  const utils = trpc.useUtils();

  const createMeeting = trpc.meetings.create.useMutation({
    onSuccess: () => { utils.meetings.list.invalidate(); setCreateOpen(false); toast.success("Meeting created"); },
    onError: (err) => toast.error(err.message),
  });

  const generateTalkingPoints = trpc.ai.generateTalkingPoints.useMutation({
    onError: (err) => toast.error(err.message),
  });

  const deleteMeeting = trpc.meetings.delete.useMutation({
    onSuccess: () => { utils.meetings.list.invalidate(); toast.success("Meeting deleted"); },
  });

  const [form, setForm] = useState({
    title: "", meetingType: "one_on_one" as const, attendees: "",
    scheduledAt: "", duration: 30, vendorId: undefined as number | undefined,
  });

  const [genForm, setGenForm] = useState({
    meetingType: "one_on_one", attendee: "", vendorId: undefined as number | undefined,
    previousNotes: "", context: "",
  });

  const handleCreate = () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    createMeeting.mutate({
      ...form,
      scheduledAt: form.scheduledAt ? new Date(form.scheduledAt) : undefined,
    });
  };

  const handleGenerate = async () => {
    const result = await generateTalkingPoints.mutateAsync(genForm);
    setGenerateOpen(false);
    const title = `${genForm.meetingType.replace(/_/g, " ")} with ${genForm.attendee || "team member"} - ${new Date().toLocaleDateString()}`;
    await createMeeting.mutateAsync({
      title,
      meetingType: genForm.meetingType as any,
      attendees: genForm.attendee,
      talkingPoints: typeof result.content === "string" ? result.content : "",
      vendorId: genForm.vendorId,
    });
    toast.success("Meeting created with AI-generated talking points");
  };

  const meetingTypeLabels: Record<string, string> = {
    one_on_one: "1:1", team_sync: "Team Sync", vendor_review: "Vendor Review",
    qbr: "QBR", stakeholder: "Stakeholder", other: "Other",
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Mia Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-primary/5 via-card to-chart-3/5 rounded-2xl border border-border/40 p-6">
        <MiaGreeting
          userName={user?.name || undefined}
          greeting="1:1 Meeting Assistant"
          subtitle="Tell me who you're meeting with and I'll prepare talking points, agendas, and data-driven discussion topics based on your operations data."
          mood="speaking"
        />
      </motion.div>

      <div className="flex items-center justify-end gap-2">
        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogTrigger asChild>
            <Button variant="outline"><Sparkles className="mr-2 h-4 w-4" />Ask Mia to Prep</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MiaAvatar mood="speaking" size="sm" showGlow={false} />
                Meeting Prep
              </DialogTitle>
              <DialogDescription>I'll generate talking points and an agenda based on your data.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Meeting Type</Label>
                  <Select value={genForm.meetingType} onValueChange={v => setGenForm(p => ({ ...p, meetingType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_on_one">1:1</SelectItem>
                      <SelectItem value="team_sync">Team Sync</SelectItem>
                      <SelectItem value="vendor_review">Vendor Review</SelectItem>
                      <SelectItem value="qbr">QBR</SelectItem>
                      <SelectItem value="stakeholder">Stakeholder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Attendee</Label><Input value={genForm.attendee} onChange={e => setGenForm(p => ({ ...p, attendee: e.target.value }))} placeholder="Name" /></div>
              </div>
              <div className="space-y-2">
                <Label>Related Vendor (optional)</Label>
                <Select value={genForm.vendorId?.toString() || "none"} onValueChange={v => setGenForm(p => ({ ...p, vendorId: v === "none" ? undefined : parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {vendors.data?.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Previous Meeting Notes</Label><div className="flex gap-2 items-start"><Textarea value={genForm.previousNotes} onChange={e => setGenForm(p => ({ ...p, previousNotes: e.target.value }))} rows={3} placeholder="Paste notes from last meeting..." className="flex-1" /><VoiceInputButton onTranscript={t => setGenForm(p => ({ ...p, previousNotes: p.previousNotes ? p.previousNotes + " " + t : t }))} className="mt-1" /></div></div>
              <div className="space-y-2"><Label>Additional Context</Label><div className="flex gap-2 items-start"><Textarea value={genForm.context} onChange={e => setGenForm(p => ({ ...p, context: e.target.value }))} rows={2} placeholder="Any specific topics to cover..." className="flex-1" /><VoiceInputButton onTranscript={t => setGenForm(p => ({ ...p, context: p.context ? p.context + " " + t : t }))} className="mt-1" /></div></div>
              <Button onClick={handleGenerate} disabled={generateTalkingPoints.isPending} className="w-full">
                {generateTalkingPoints.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mia is preparing...</> : <><Sparkles className="mr-2 h-4 w-4" />Generate & Create Meeting</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />New Meeting</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Meeting</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Weekly 1:1 with Sarah" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.meetingType} onValueChange={v => setForm(p => ({ ...p, meetingType: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_on_one">1:1</SelectItem>
                      <SelectItem value="team_sync">Team Sync</SelectItem>
                      <SelectItem value="vendor_review">Vendor Review</SelectItem>
                      <SelectItem value="qbr">QBR</SelectItem>
                      <SelectItem value="stakeholder">Stakeholder</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Duration (min)</Label><Input type="number" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: parseInt(e.target.value) || 30 }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Attendees</Label><Input value={form.attendees} onChange={e => setForm(p => ({ ...p, attendees: e.target.value }))} placeholder="Names" /></div>
                <div className="space-y-2"><Label>Scheduled</Label><Input type="datetime-local" value={form.scheduledAt} onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))} /></div>
              </div>
              <Button onClick={handleCreate} disabled={createMeeting.isPending} className="w-full">
                {createMeeting.isPending ? "Creating..." : "Create Meeting"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* View Meeting Dialog with Mia */}
      <Dialog open={!!viewMeeting} onOpenChange={() => setViewMeeting(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{viewMeeting?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {viewMeeting?.talkingPoints && (
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" />Mia's Talking Points</h3>
                <MiaMessage content={viewMeeting.talkingPoints} mood="speaking" avatarSize="sm" />
              </div>
            )}
            {viewMeeting?.notes && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Notes</h3>
                <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/50 rounded-lg p-4"><Streamdown>{viewMeeting.notes}</Streamdown></div>
              </div>
            )}
            {viewMeeting?.summary && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Summary</h3>
                <MiaMessage content={viewMeeting.summary} mood="neutral" avatarSize="sm" />
              </div>
            )}
            {!viewMeeting?.talkingPoints && !viewMeeting?.notes && !viewMeeting?.summary && (
              <div className="flex items-center gap-3 py-8 justify-center">
                <MiaAvatar mood="neutral" size="md" />
                <p className="text-sm text-muted-foreground">No content yet for this meeting.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {meetings.isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : !meetings.data?.length ? (
        <Card className="border-dashed border-border/40">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MiaAvatar mood="neutral" size="lg" />
            <p className="text-sm text-muted-foreground mt-4">No meetings yet. Let me help you prepare for your next one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {meetings.data.map((meeting, i) => (
            <motion.div key={meeting.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="border-border/40 hover:shadow-sm transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary shrink-0" />
                        <h3 className="text-sm font-medium truncate">{meeting.title}</h3>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">{meetingTypeLabels[meeting.meetingType] || meeting.meetingType}</Badge>
                        {meeting.attendees && <span className="text-[11px] text-muted-foreground">{meeting.attendees}</span>}
                        {meeting.scheduledAt && <span className="text-[11px] text-muted-foreground">{new Date(meeting.scheduledAt).toLocaleString()}</span>}
                        {meeting.talkingPoints && <Badge variant="outline" className="text-[10px]"><Sparkles className="h-2.5 w-2.5 mr-1" />Mia Prep</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewMeeting(meeting)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteMeeting.mutate({ id: meeting.id })}><Trash2 className="h-4 w-4" /></Button>
                    </div>
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
