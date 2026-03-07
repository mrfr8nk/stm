import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Plus, Pin, Trash2, RotateCcw, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AdminAnnouncements = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [deletedAnn, setDeletedAnn] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [targetRole, setTargetRole] = useState<string>("");
  const [isPinned, setIsPinned] = useState(false);
  const [editAnn, setEditAnn] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);

  const fetchData = async () => {
    const { data } = await supabase.from("announcements").select("*").order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
    const all = data || [];
    if (all.length > 0) {
      const authorIds = [...new Set(all.map(a => a.author_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", authorIds);
      const profileMap: Record<string, any> = {};
      (profiles || []).forEach(p => { profileMap[p.user_id] = p; });
      const enriched = all.map(a => ({ ...a, profiles: profileMap[a.author_id] || null }));
      setAnnouncements(enriched.filter((a: any) => !a.deleted_at));
      setDeletedAnn(enriched.filter((a: any) => a.deleted_at));
    } else {
      setAnnouncements([]);
      setDeletedAnn([]);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handlePost = async () => {
    if (!title.trim() || !content.trim() || !user) return;
    const { error } = await supabase.from("announcements").insert({
      title: title.trim(), content: content.trim(), author_id: user.id,
      target_role: targetRole || null, is_pinned: isPinned,
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Posted" }); setTitle(""); setContent(""); setIsPinned(false); fetchData(); }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("announcements").update({ deleted_at: new Date().toISOString() } as any).eq("id", id);
    toast({ title: "Announcement Deleted" }); fetchData();
  };

  const handleRestore = async (id: string) => {
    await supabase.from("announcements").update({ deleted_at: null } as any).eq("id", id);
    toast({ title: "Announcement Restored" }); fetchData();
  };

  const handlePermanentDelete = async (id: string) => {
    if (!confirm("Permanently delete this announcement?")) return;
    await supabase.from("announcements").delete().eq("id", id);
    toast({ title: "Permanently Deleted" }); fetchData();
  };

  const handleEditSave = async () => {
    if (!editAnn) return;
    const { error } = await supabase.from("announcements").update({
      title: editAnn.title, content: editAnn.content,
      target_role: editAnn.target_role || null, is_pinned: editAnn.is_pinned,
    }).eq("id", editAnn.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Updated" }); setEditOpen(false); fetchData(); }
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
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} /> Pin</label>
              <Button onClick={handlePost}>Publish</Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({announcements.length})</TabsTrigger>
            <TabsTrigger value="deleted">Deleted ({deletedAnn.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {announcements.map(a => (
              <Card key={a.id} className="mb-3">
                <CardContent className="p-4 flex items-start gap-3">
                  {a.is_pinned && <Pin className="w-4 h-4 text-secondary shrink-0 mt-1" />}
                  <div className="flex-1">
                    <p className="font-bold text-foreground">{a.title}</p>
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
                      {a.target_role && ` • ${a.target_role}s only`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setEditAnn({...a}); setEditOpen(true); }}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="deleted">
            {deletedAnn.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No deleted announcements.</CardContent></Card>
            ) : deletedAnn.map(a => (
              <Card key={a.id} className="mb-3 opacity-70">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="flex-1">
                    <p className="font-bold text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground">Deleted {new Date(a.deleted_at).toLocaleDateString()}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRestore(a.id)}><RotateCcw className="w-4 h-4 text-primary" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => handlePermanentDelete(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Announcement</DialogTitle></DialogHeader>
            {editAnn && (
              <div className="space-y-3">
                <Input value={editAnn.title} onChange={e => setEditAnn({...editAnn, title: e.target.value})} />
                <textarea className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm min-h-[100px] resize-y" value={editAnn.content} onChange={e => setEditAnn({...editAnn, content: e.target.value})} />
                <select className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm" value={editAnn.target_role || ""} onChange={e => setEditAnn({...editAnn, target_role: e.target.value || null})}>
                  <option value="">All Users</option><option value="teacher">Teachers</option><option value="student">Students</option>
                </select>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editAnn.is_pinned} onChange={e => setEditAnn({...editAnn, is_pinned: e.target.checked})} /> Pinned</label>
                <Button className="w-full" onClick={handleEditSave}>Save Changes</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminAnnouncements;
