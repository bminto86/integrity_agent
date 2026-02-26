import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageSquare, Sparkles, Loader2, Eye, Copy, CheckSquare } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function MeetingSummarizer() {
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
    await updateMeeting.mutateAsync({
      id: parseInt(meetingId),
      summary: result.summary,
      actionItems: result.actionItems,
      notes,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meeting Summarizer</h1>
        <p className="text-sm text-muted-foreground mt-1">Paste meeting notes or transcripts to generate summaries and extract action items.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-4">
          <Card className="border-border/50">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label>Link to Meeting (optional)</Label>
                <Select value={meetingId} onValueChange={setMeetingId}>
                  <SelectTrigger><SelectValue placeholder="Select meeting" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None - standalone summary</SelectItem>
                    {meetings.data?.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Meeting Notes / Transcript *</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={16}
                  placeholder="Paste your meeting notes, transcript, or discussion points here...

Example:
- Discussed Q4 vendor performance
- Sarah raised concerns about Vendor A's accuracy dropping to 88%
- Agreed to schedule a calibration session next week
- John to prepare the updated SLA document by Friday
- Need to hire 15 more reviewers for APAC region..."
                  className="font-mono text-sm"
                />
              </div>
              <Button onClick={handleSummarize} disabled={summarize.isPending} className="w-full">
                {summarize.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Summarizing...</> : <><Sparkles className="mr-2 h-4 w-4" />Summarize Meeting</>}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Output Panel */}
        <div className="space-y-4">
          {!result ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-20">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground text-center">Paste your meeting notes and click "Summarize Meeting" to generate a summary and extract action items.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary" />Summary
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.summary)} className="text-xs">
                      <Copy className="mr-1 h-3 w-3" />Copy
                    </Button>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/50 rounded-lg p-4">
                    <Streamdown>{result.summary}</Streamdown>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-primary" />Action Items
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(result.actionItems)} className="text-xs">
                      <Copy className="mr-1 h-3 w-3" />Copy
                    </Button>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/50 rounded-lg p-4">
                    <Streamdown>{result.actionItems}</Streamdown>
                  </div>
                </CardContent>
              </Card>

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
