import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Plus, Pin, Trash2, RotateCcw, Edit, Send, Users, GraduationCap, BookOpen, Globe, Megaphone, Clock, PinOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const AUDIENCE_OPTIONS = [
  { value: "", label: "Everyone", icon: Globe, color: "bg-primary/10 text-primary" },
  { value: "teacher", label: "Teachers", icon: BookOpen, color: "bg-secondary/10 text-secondary" },
  { value: "student", label: "Students", icon: GraduationCap, color: "bg-accent/10 text-accent" },
];

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
    if (!title.trim() || !content.trim() || !user) {
      toast({ title: "Missing Fields", description: "Title and content are required.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("announcements").insert({
      title: title.trim(), content: content.trim(), author_id: user.id,
      target_role: targetRole || null, is_pinned: isPinned,
    } as any);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Announcement Published!" }); setTitle(""); setContent(""); setIsPinned(false); setTargetRole(""); fetchData(); }
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

  const handleTogglePin = async (id: string, currentPin: boolean) => {
    await supabase.from("announcements").update({ is_pinned: !currentPin }).eq("id", id);
    toast({ title: currentPin ? "Unpinned" : "Pinned" }); fetchData();
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

  const getAudienceBadge = (role: string | null) => {
    const opt = AUDIENCE_OPTIONS.find(o => o.value === (role || ""));
    if (!opt) return null;
    const Icon = opt.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${opt.color}`}>
        <Icon className="w-3 h-3" /> {opt.label}
      </span>
    );
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-primary" /> Announcements
            </h1>
            <p className="text-sm text-muted-foreground">Create and manage school-wide announcements</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{announcements.length} Active</Badge>
            <Badge variant="outline" className="text-xs text-muted-foreground">{announcements.filter(a => a.is_pinned).length} Pinned</Badge>
          </div>
        </div>

        {/* Compose Card */}
        <Card className="border-2 border-dashed border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-1.5 rounded-lg bg-primary/10"><Plus className="w-4 h-4 text-primary" /></div>
              New Announcement
            </CardTitle>
            <CardDescription>Compose a message to share with staff and students</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Title</label>
              <Input
                placeholder="e.g. Term 2 Exam Timetable Released"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="font-medium text-base"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Message</label>
              <textarea
                placeholder="Write your announcement here..."
                value={content}
                onChange={e => setContent(e.target.value)}
                className="w-full border border-input rounded-lg px-3 py-3 bg-background text-foreground text-sm min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex flex-wrap items-center gap-4">
                {/* Audience selector */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Audience</label>
                  <div className="flex gap-1.5">
                    {AUDIENCE_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      const isActive = targetRole === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setTargetRole(opt.value)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            isActive
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-border bg-background text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" /> {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Pin toggle */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Pin</label>
                  <Switch checked={isPinned} onCheckedChange={setIsPinned} />
                </div>
              </div>

              <Button onClick={handlePost} className="gap-2 px-6">
                <Send className="w-4 h-4" /> Publish
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Announcements List */}
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active" className="gap-1.5"><Bell className="w-4 h-4" /> Active ({announcements.length})</TabsTrigger>
            <TabsTrigger value="deleted" className="gap-1.5"><Trash2 className="w-4 h-4" /> Deleted ({deletedAnn.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3 mt-4">
            {announcements.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-4 rounded-full bg-muted mb-4"><Megaphone className="w-8 h-8 text-muted-foreground" /></div>
                  <p className="font-medium text-foreground">No announcements yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Create your first announcement above</p>
                </CardContent>
              </Card>
            ) : announcements.map(a => (
              <Card key={a.id} className={`transition-all hover:shadow-md ${a.is_pinned ? "border-l-4 border-l-secondary bg-secondary/[0.03]" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${a.is_pinned ? "bg-secondary/10" : "bg-muted"}`}>
                      {a.is_pinned ? <Pin className="w-4 h-4 text-secondary" /> : <Bell className="w-4 h-4 text-muted-foreground" />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-display font-bold text-foreground text-base leading-tight">{a.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {getAudienceBadge(a.target_role)}
                            {a.is_pinned && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                                <Pin className="w-3 h-3" /> Pinned
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatTimeAgo(a.created_at)}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground mt-3 whitespace-pre-line leading-relaxed">{a.content}</p>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                          {(a as any).profiles?.full_name && (
                            <span>
                              Posted by <span className="font-medium text-foreground">{(a as any).profiles.full_name}</span>
                              {" · "}
                            </span>
                          )}
                          {new Date(a.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                        <div className="flex gap-0.5">
                          <Button variant="ghost" size="sm" onClick={() => handleTogglePin(a.id, a.is_pinned)} title={a.is_pinned ? "Unpin" : "Pin"}>
                            {a.is_pinned ? <PinOff className="w-4 h-4 text-muted-foreground" /> : <Pin className="w-4 h-4 text-muted-foreground" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setEditAnn({...a}); setEditOpen(true); }}>
                            <Edit className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(a.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="deleted" className="space-y-3 mt-4">
            {deletedAnn.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Trash2 className="w-8 h-8 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No deleted announcements</p>
                </CardContent>
              </Card>
            ) : deletedAnn.map(a => (
              <Card key={a.id} className="opacity-70 hover:opacity-100 transition-opacity">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-muted"><Trash2 className="w-4 h-4 text-muted-foreground" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground">Deleted {new Date(a.deleted_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => handleRestore(a.id)} className="gap-1.5 text-xs">
                      <RotateCcw className="w-3.5 h-3.5" /> Restore
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handlePermanentDelete(a.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Edit className="w-5 h-5 text-primary" /> Edit Announcement</DialogTitle>
              <DialogDescription>Update the announcement details below</DialogDescription>
            </DialogHeader>
            {editAnn && (
              <div className="space-y-4 mt-2">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Title</label>
                  <Input value={editAnn.title} onChange={e => setEditAnn({...editAnn, title: e.target.value})} className="font-medium" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Message</label>
                  <textarea
                    className="w-full border border-input rounded-lg px-3 py-3 bg-background text-foreground text-sm min-h-[120px] resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={editAnn.content}
                    onChange={e => setEditAnn({...editAnn, content: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Audience</label>
                  <div className="flex gap-1.5">
                    {AUDIENCE_OPTIONS.map(opt => {
                      const Icon = opt.icon;
                      const isActive = (editAnn.target_role || "") === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setEditAnn({...editAnn, target_role: opt.value || null})}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            isActive
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-border bg-background text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" /> {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Pin className="w-4 h-4 text-muted-foreground" />
                    <label className="text-sm font-medium">Pin to top</label>
                  </div>
                  <Switch checked={editAnn.is_pinned} onCheckedChange={v => setEditAnn({...editAnn, is_pinned: v})} />
                </div>
                <Button className="w-full gap-2" onClick={handleEditSave}>
                  <Send className="w-4 h-4" /> Save Changes
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminAnnouncements;
