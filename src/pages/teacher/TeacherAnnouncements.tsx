import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plus, Pin, Users, Trash2, Globe } from "lucide-react";

const TeacherAnnouncements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [assignments, setAssignments] = useState<any[]>([]);
  const [posting, setPosting] = useState(false);
  const [filter, setFilter] = useState<"all" | "mine" | "class">("all");

  const fetchAnnouncements = async () => {
    const { data } = await supabase.from("announcements").select("*, classes:target_class_id(name)")
      .is("deleted_at", null).order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
    if (data && data.length > 0) {
      const authorIds = [...new Set(data.map(a => a.author_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", authorIds);
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach(p => { profileMap[p.user_id] = p; });
      setAnnouncements(data.map(a => ({ ...a, profiles: profileMap[a.author_id] || null })));
    } else {
      setAnnouncements([]);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    if (user) {
      supabase.from("teacher_assignments").select("*, classes(*)").eq("teacher_id", user.id)
        .then(({ data }) => setAssignments(data || []));
    }
  }, [user]);

  const uniqueClasses = Array.from(new Map(assignments.map(a => [a.class_id, a.classes])).values()).filter(Boolean);

  const handlePost = async () => {
    if (!title.trim() || !content.trim() || !user) return;
    setPosting(true);
    const insertData: any = { title: title.trim(), content: content.trim(), author_id: user.id };
    if (targetClassId) insertData.target_class_id = targetClassId;

    const { error } = await supabase.from("announcements").insert(insertData);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Posted", description: targetClassId ? "Class announcement published." : "General announcement published." });
      setTitle(""); setContent(""); setTargetClassId("");
      fetchAnnouncements();
      await supabase.from("activity_log").insert({ user_id: user.id, action: "Posted announcement", details: title.trim(), entity_type: "announcements" });
    }
    setPosting(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("announcements").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    toast({ title: "Deleted" });
    fetchAnnouncements();
  };

  const filtered = announcements.filter(a => {
    if (filter === "mine") return a.author_id === user?.id;
    if (filter === "class") return a.target_class_id;
    return true;
  });

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Announcements</h1>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> Post Announcement</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
            <textarea placeholder="Announcement content..." value={content} onChange={e => setContent(e.target.value)}
              className="w-full border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm min-h-[100px] resize-y" />
            <div className="flex gap-3 items-center flex-wrap">
              <select className="border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm" value={targetClassId} onChange={e => setTargetClassId(e.target.value)}>
                <option value="">All Students (General)</option>
                {uniqueClasses.map((cls: any) => <option key={cls.id} value={cls.id}>{cls.name} only</option>)}
              </select>
              <Button onClick={handlePost} disabled={posting}>{posting ? "Posting..." : "Publish"}</Button>
            </div>
          </CardContent>
        </Card>

        {/* Filter */}
        <div className="flex gap-2">
          {(["all", "mine", "class"] as const).map(f => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>
              {f === "all" ? "All" : f === "mine" ? "My Posts" : "Class Only"}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map(a => (
            <Card key={a.id} className={`border-l-4 ${a.target_class_id ? "border-l-secondary" : "border-l-primary"}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {a.is_pinned && <Pin className="w-4 h-4 text-secondary shrink-0 mt-1" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-foreground">{a.title}</p>
                      {a.target_class_id ? (
                        <Badge variant="secondary" className="text-xs"><Users className="w-3 h-3 mr-1" />{(a as any).classes?.name || "Class"}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs"><Globe className="w-3 h-3 mr-1" />General</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{a.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {(a as any).profiles?.full_name && (
                        <span className="font-medium text-primary mr-2">
                          — {(a as any).profiles.full_name.split(" ").length > 1 
                            ? `Mr/Mrs ${(a as any).profiles.full_name.split(" ").slice(-1)[0]}` 
                            : (a as any).profiles.full_name}
                        </span>
                      )}
                      {new Date(a.created_at).toLocaleString()}
                    </p>
                  </div>
                  {a.author_id === user?.id && (
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)} className="text-red-500 hover:text-red-700 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No announcements found.</p>}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TeacherAnnouncements;
