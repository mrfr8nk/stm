import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plus, Pin } from "lucide-react";

const TeacherAnnouncements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  const fetchAnnouncements = async () => {
    const { data } = await supabase.from("announcements").select("*").order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
    setAnnouncements(data || []);
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const handlePost = async () => {
    if (!title.trim() || !content.trim() || !user) return;
    setPosting(true);
    const { error } = await supabase.from("announcements").insert({
      title: title.trim(),
      content: content.trim(),
      author_id: user.id,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Posted", description: "Announcement published." });
      setTitle(""); setContent("");
      fetchAnnouncements();
    }
    setPosting(false);
  };

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Announcements</h1>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Post Announcement</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
            <textarea
              placeholder="Announcement content..."
              value={content}
              onChange={e => setContent(e.target.value)}
              className="w-full border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm min-h-[100px] resize-y"
            />
            <Button onClick={handlePost} disabled={posting}>{posting ? "Posting..." : "Publish"}</Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {announcements.map(a => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {a.is_pinned && <Pin className="w-4 h-4 text-secondary shrink-0 mt-1" />}
                  <div className="flex-1">
                    <p className="font-bold text-foreground">{a.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{a.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherAnnouncements;
