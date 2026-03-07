import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plus, Pin, Trash2 } from "lucide-react";

const AdminAnnouncements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetRole, setTargetRole] = useState<string>("");
  const [isPinned, setIsPinned] = useState(false);

  const fetch = async () => {
    const { data } = await supabase.from("announcements").select("*").order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
    setAnnouncements(data || []);
  };

  useEffect(() => { fetch(); }, []);

  const handlePost = async () => {
    if (!title.trim() || !content.trim() || !user) return;
    const { error } = await supabase.from("announcements").insert({
      title: title.trim(), content: content.trim(), author_id: user.id,
      target_role: targetRole || null, is_pinned: isPinned,
    } as any);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Posted" }); setTitle(""); setContent(""); setIsPinned(false); fetch(); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("announcements").delete().eq("id", id);
    fetch();
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Announcements</h1>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Post Announcement</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
            <textarea placeholder="Content..." value={content} onChange={e => setContent(e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm min-h-[100px] resize-y" />
            <div className="flex flex-wrap gap-3 items-center">
              <select className="border border-input rounded-lg px-3 py-2 bg-background text-sm" value={targetRole} onChange={e => setTargetRole(e.target.value)}>
                <option value="">All Users</option>
                <option value="teacher">Teachers Only</option>
                <option value="student">Students Only</option>
              </select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} /> Pin announcement</label>
              <Button onClick={handlePost}>Publish</Button>
            </div>
          </CardContent>
        </Card>

        {announcements.map(a => (
          <Card key={a.id}>
            <CardContent className="p-4 flex items-start gap-3">
              {a.is_pinned && <Pin className="w-4 h-4 text-secondary shrink-0 mt-1" />}
              <div className="flex-1">
                <p className="font-bold text-foreground">{a.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{a.content}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(a.created_at).toLocaleString()}
                  {a.target_role && ` • ${a.target_role}s only`}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default AdminAnnouncements;
