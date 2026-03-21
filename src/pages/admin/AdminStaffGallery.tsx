import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Trash2, Edit, Upload, User, Eye, EyeOff, Crown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ExportDropdown from "@/components/ExportDropdown";
import defaultHeadmasterImg from "@/assets/headmaster.jpg";

const CATEGORIES = [
  { value: "admin", label: "Administration" },
  { value: "senior", label: "Senior Teachers" },
  { value: "teachers", label: "Teaching Staff" },
];

const AdminStaffGallery = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const headmasterFileRef = useRef<HTMLInputElement>(null);

  // Headmaster settings
  const [headmasterImage, setHeadmasterImage] = useState<string>("");
  const [headmasterName, setHeadmasterName] = useState<string>("Mr. Nyabako");
  const [headmasterTitle, setHeadmasterTitle] = useState<string>("Head Master");
  const [headmasterQuote, setHeadmasterQuote] = useState<string>("");
  const [uploadingHeadmaster, setUploadingHeadmaster] = useState(false);
  const [savingHeadmaster, setSavingHeadmaster] = useState(false);

  const [form, setForm] = useState({
    name: "", position: "", department: "", subject: "",
    category: "teachers", email: "", bio: "", education: "",
    experience: "", image_url: "",
  });

  const fetchStaff = async () => {
    const { data } = await supabase
      .from("staff_gallery")
      .select("*")
      .order("display_order")
      .order("created_at");
    setStaff(data || []);
  };

  const fetchHeadmasterSettings = async () => {
    const keys = ["headmaster_image", "headmaster_name", "headmaster_title", "headmaster_quote"];
    const { data } = await supabase.from("system_settings").select("*").in("key", keys);
    if (data) {
      data.forEach((item: any) => {
        if (item.key === "headmaster_image" && item.value) setHeadmasterImage(item.value);
        if (item.key === "headmaster_name" && item.value) setHeadmasterName(item.value);
        if (item.key === "headmaster_title" && item.value) setHeadmasterTitle(item.value);
        if (item.key === "headmaster_quote" && item.value) setHeadmasterQuote(item.value);
      });
    }
  };

  useEffect(() => { fetchStaff(); fetchHeadmasterSettings(); }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("staff-photos").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("staff-photos").getPublicUrl(path);
    setForm(f => ({ ...f, image_url: urlData.publicUrl }));
    setUploading(false);
  };

  const handleHeadmasterImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHeadmaster(true);
    const ext = file.name.split(".").pop();
    const path = `headmaster-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("staff-photos").upload(path, file);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      setUploadingHeadmaster(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("staff-photos").getPublicUrl(path);
    setHeadmasterImage(urlData.publicUrl);
    setUploadingHeadmaster(false);
  };

  const handleSaveHeadmasterSettings = async () => {
    setSavingHeadmaster(true);
    const settings = [
      { key: "headmaster_image", value: headmasterImage },
      { key: "headmaster_name", value: headmasterName },
      { key: "headmaster_title", value: headmasterTitle },
      { key: "headmaster_quote", value: headmasterQuote },
    ];
    
    for (const setting of settings) {
      await supabase.from("system_settings").upsert({
        key: setting.key,
        value: setting.value,
        updated_at: new Date().toISOString(),
        updated_by: user?.id,
      }, { onConflict: "key" });
    }
    
    toast({ title: "Headmaster settings saved" });
    setSavingHeadmaster(false);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.position.trim()) {
      toast({ title: "Name and position are required", variant: "destructive" });
      return;
    }

    const payload = {
      name: form.name.trim(),
      position: form.position.trim(),
      department: form.department.trim() || null,
      subject: form.subject.trim() || null,
      category: form.category,
      email: form.email.trim() || null,
      bio: form.bio.trim() || null,
      education: form.education.trim() || null,
      experience: form.experience.trim() || null,
      image_url: form.image_url || null,
    };

    if (editItem) {
      await supabase.from("staff_gallery").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", editItem.id);
      toast({ title: "Staff member updated" });
    } else {
      await supabase.from("staff_gallery").insert({ ...payload, created_by: user?.id });
      toast({ title: "Staff member added" });
    }

    resetForm();
    fetchStaff();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("staff_gallery").delete().eq("id", id);
    toast({ title: "Staff member removed" });
    fetchStaff();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("staff_gallery").update({ is_active: !current }).eq("id", id);
    fetchStaff();
  };

  const resetForm = () => {
    setForm({ name: "", position: "", department: "", subject: "", category: "teachers", email: "", bio: "", education: "", experience: "", image_url: "" });
    setEditItem(null);
    setFormOpen(false);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      name: item.name || "",
      position: item.position || "",
      department: item.department || "",
      subject: item.subject || "",
      category: item.category || "teachers",
      email: item.email || "",
      bio: item.bio || "",
      education: item.education || "",
      experience: item.experience || "",
      image_url: item.image_url || "",
    });
    setFormOpen(true);
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Staff Gallery</h1>
            <p className="text-muted-foreground text-sm">Manage staff profiles shown on the website</p>
          </div>
          <div className="flex gap-2">
            <ExportDropdown
              title="Staff Directory"
              filename="staff_directory"
              headers={["Name", "Position", "Department", "Subject", "Category", "Email", "Education", "Experience"]}
              rows={staff.map(s => [s.name, s.position, s.department || "", s.subject || "", s.category, s.email || "", s.education || "", s.experience || ""])}
              disabled={staff.length === 0}
            />
            <Button onClick={() => { resetForm(); setFormOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> Add Staff
            </Button>
          </div>
        </div>

        {/* Headmaster Settings Card */}
        <Card className="border-l-4 border-l-secondary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-secondary" /> Headmaster Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Update the headmaster image and details displayed on the homepage.
            </p>
            <div className="grid md:grid-cols-[200px_1fr] gap-6">
              <div className="space-y-3">
                <div className="relative">
                  <img 
                    src={headmasterImage || defaultHeadmasterImg} 
                    alt="Headmaster" 
                    className="w-full aspect-square rounded-xl object-cover border border-border shadow-sm"
                  />
                </div>
                <input 
                  ref={headmasterFileRef} 
                  type="file" 
                  accept="image/*" 
                  onChange={handleHeadmasterImageUpload} 
                  className="hidden" 
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => headmasterFileRef.current?.click()} 
                  disabled={uploadingHeadmaster}
                >
                  <Upload className="w-4 h-4 mr-1" /> 
                  {uploadingHeadmaster ? "Uploading..." : "Change Photo"}
                </Button>
              </div>
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Name</label>
                    <Input 
                      placeholder="Headmaster name" 
                      value={headmasterName} 
                      onChange={e => setHeadmasterName(e.target.value)} 
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Title</label>
                    <Input 
                      placeholder="e.g. Head Master" 
                      value={headmasterTitle} 
                      onChange={e => setHeadmasterTitle(e.target.value)} 
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Quote / Message (optional)</label>
                  <textarea
                    className="w-full border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm min-h-[100px] resize-y"
                    placeholder="A welcoming message or inspirational quote from the headmaster..."
                    value={headmasterQuote}
                    onChange={e => setHeadmasterQuote(e.target.value)}
                  />
                </div>
                <Button onClick={handleSaveHeadmasterSettings} disabled={savingHeadmaster}>
                  {savingHeadmaster ? "Saving..." : "Save Headmaster Settings"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {staff.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No staff members added yet. Click "Add Staff" to get started.</p>
            </CardContent>
          </Card>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staff.map((member) => (
            <Card key={member.id} className={!member.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {member.image_url ? (
                    <img src={member.image_url} alt={member.name} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-foreground text-sm">{member.name}</h3>
                    <p className="text-xs text-muted-foreground">{member.position}</p>
                    <p className="text-xs text-muted-foreground">{member.category}</p>
                    {!member.is_active && <p className="text-xs text-destructive font-semibold mt-1">Hidden</p>}
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(member.id, member.is_active)}>
                    {member.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(member)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(member.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editItem ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Full name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <Input placeholder="Position *" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Department" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
                <Input placeholder="Subject" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select
                  className="border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <Input placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <textarea
                className="w-full border border-input rounded-lg px-3 py-2 bg-background text-foreground text-sm min-h-[80px] resize-y"
                placeholder="Bio (optional)"
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Education" value={form.education} onChange={e => setForm(f => ({ ...f, education: e.target.value }))} />
                <Input placeholder="Experience" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Photo</label>
                <div className="flex items-center gap-3">
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <Upload className="w-4 h-4 mr-1" /> {uploading ? "Uploading..." : "Upload Photo"}
                  </Button>
                  {form.image_url && (
                    <div className="flex items-center gap-2">
                      <img src={form.image_url} alt="" className="w-12 h-12 rounded object-cover" />
                      <Button variant="ghost" size="sm" onClick={() => setForm(f => ({ ...f, image_url: "" }))}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleSave}>{editItem ? "Save Changes" : "Add Staff"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminStaffGallery;
