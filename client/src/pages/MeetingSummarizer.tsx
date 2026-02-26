import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MiaGreeting, MiaMessage, MiaAvatar } from "@/components/Mia";
import { VoiceInputButton } from "@/components/VoiceButton";
import { Sparkles, Loader2, Copy, CheckSquare, MessageSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function MeetingSummarizer() {
  const { user } = useAuth();
  const [notes, setNotes] = useState("");
  const [meetingId, setMeetingId] = useState<string>("none");
  const [result, setResult] = useState<{ summary: string; actionItems: string } | null>(null);
  const meetings = trpc.meetings.list.useQuery();
  const utils = trpc.useUtils();

  const summarize = trpc.ai.summarizeMeeting.useMutation({
    onSuccess: (data: any) => {
      setResult({
        summary: typeof data.summary === "string" ? data.summary : "",
        actionItems: typeof data.actionItems === "string" ? data.actionItems : "",
      });
      toast.success("Meeting summarized");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateMeeting = trpc.meetings.update.useMutation({
    onSuccess: () => { utils.meetings.list.invalidate(); toast.success("Meeting updated with summary"); },
  });

  const handleSummarize = () => {
    if (!notes.trim()) { toast.error("Please paste meeting notes or transcript"); return; }
    summarize.mutate({ notes });
  };

  const handleSaveToMeeting = async () => {
    if (!result || meetingId === "none") { toast.error("Select a meeting to save to"); return; }
    await updateMeeting.mutateAsync({ id: parseInt(meetingId), summary: result.summary, actionItems: result.actionItems, notes });
  };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied to clipboard"); };

  return (
    <div className="space-y-6 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-primary/5 via-card to-chart-5/5 rounded-2xl border border-border/40 p-6">
        <MiaGreeting userName={user?.name || undefined} greeting="Meeting Summarizer" subtitle="Paste your meeting notes or transcript and I'll extract a clean summary with action items. I can also link it to an existing meeting record." mood="speaking" />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card className="border-border/40">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label>Link to Meeting (optional)</Label>
                <Select value={meetingId} onValueChange={setMeetingId}><SelectTrigger><SelectValue placeholder="Select meeting" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None - standalone summary</SelectItem>
                    {meetings.data?.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Meeting Notes / Transcript *</Label>
                <div className="flex gap-2 items-start">
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={16} placeholder="Paste your meeting notes, transcript, or discussion points here..." className="font-mono text-sm flex-1" />
                  <VoiceInputButton onTranscript={t => setNotes(p => p ? p + " " + t : t)} className="mt-1" />
                </div>
              </div>
              <Button onClick={handleSummarize} disabled={summarize.isPending} className="w-full">
                {summarize.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mia is summarizing...</> : <><Sparkles className="mr-2 h-4 w-4" />Ask Mia to Summarize</>}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {!result ? (
            <Card className="border-dashed border-border/40">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <MiaAvatar mood="neutral" size="lg" />
                <p className="text-sm text-muted-foreground text-center mt-4">Paste your meeting notes and I'll generate a summary with action items.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border/40">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" />Summary</h3>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.summary)} className="text-xs"><Copy className="mr-1 h-3 w-3" />Copy</Button>
                    </div>
                    <MiaMessage content={result.summary} mood="speaking" avatarSize="sm" />
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="border-border/40">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold flex items-center gap-2"><CheckSquare className="h-4 w-4 text-primary" />Action Items</h3>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.actionItems)} className="text-xs"><Copy className="mr-1 h-3 w-3" />Copy</Button>
                    </div>
                    <MiaMessage content={result.actionItems} mood="thinking" avatarSize="sm" />
                  </CardContent>
                </Card>
              </motion.div>

              {meetingId !== "none" && (
                <Button onClick={handleSaveToMeeting} disabled={updateMeeting.isPending} variant="outline" className="w-full">
                  {updateMeeting.isPending ? "Saving..." : "Save Summary to Meeting"}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
