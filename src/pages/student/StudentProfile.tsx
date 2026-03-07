import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User, Save, Heart, Shield, Edit, X } from "lucide-react";
import AvatarUpload from "@/components/AvatarUpload";
import ThemeToggle from "@/components/ThemeToggle";

const StudentProfile = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState("");
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null);
  const [editingIdentity, setEditingIdentity] = useState(false);
  const [editingMedical, setEditingMedical] = useState(false);
  const [identityForm, setIdentityForm] = useState<any>({});
  const [medicalForm, setMedicalForm] = useState<any>({});

  useEffect(() => {
    if (profile) { setFullName(profile.full_name || ""); setAvatarUrl(profile.avatar_url || null); }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase.from("student_profiles").select("*").eq("user_id", user.id).single()
      .then(({ data }) => {
        setStudentProfile(data);
        if (data) {
          setIdentityForm({
            national_id: data.national_id || "",
            birth_cert_number: data.birth_cert_number || "",
            guardian_name: data.guardian_name || "",
            guardian_phone: data.guardian_phone || "",
            guardian_email: data.guardian_email || "",
            address: data.address || "",
            emergency_contact: data.emergency_contact || "",
            emergency_phone: data.emergency_phone || "",
            date_of_birth: data.date_of_birth || "",
          });
          setMedicalForm({
            blood_type: data.blood_type || "",
            allergies: data.allergies || "",
            medical_conditions: data.medical_conditions || "",
          });
        }
      });
    supabase.from("profiles").select("phone").eq("user_id", user.id).single()
      .then(({ data }) => { if (data?.phone) setPhone(data.phone); });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone }).eq("user_id", user.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Profile Updated" });
    setSaving(false);
  };

  const handleSaveIdentity = async () => {
    if (!user || !studentProfile) return;
    setSaving(true);
    const { error } = await supabase.from("student_profiles").update(identityForm).eq("user_id", user.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Identity & Guardian Updated" });
      setStudentProfile({ ...studentProfile, ...identityForm });
      setEditingIdentity(false);
    }
    setSaving(false);
  };

  const handleSaveMedical = async () => {
    if (!user || !studentProfile) return;
    setSaving(true);
    const { error } = await supabase.from("student_profiles").update(medicalForm).eq("user_id", user.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Medical Info Updated" });
      setStudentProfile({ ...studentProfile, ...medicalForm });
      setEditingMedical(false);
    }
    setSaving(false);
  };

  return (
    <DashboardLayout role="student">
      <div className="space-y-6 max-w-3xl">
        <h1 className="font-display text-2xl font-bold text-foreground">Account Settings</h1>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {user && <AvatarUpload userId={user.id} currentUrl={avatarUrl} name={profile?.full_name || "S"} onUploaded={setAvatarUrl} />}
              <div>
                <p className="text-xl font-bold text-foreground">{profile?.full_name || "Student"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                {studentProfile && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">Form {studentProfile.form}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">{studentProfile.level?.replace("_", " ").toUpperCase()}</span>
                    {studentProfile.student_id && <span className="text-xs font-mono text-muted-foreground">ID: {studentProfile.student_id}</span>}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div><p className="font-medium text-foreground">Appearance</p><p className="text-sm text-muted-foreground">Toggle between light and dark mode</p></div>
            <ThemeToggle />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-sm font-medium text-foreground">Full Name</label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
              <div><label className="text-sm font-medium text-foreground">Email</label><Input value={user?.email || ""} disabled /></div>
              <div><label className="text-sm font-medium text-foreground">Phone</label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+263..." /></div>
            </div>
            <Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}</Button>
          </CardContent>
        </Card>

        {studentProfile && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Identity & Guardian</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setEditingIdentity(!editingIdentity)}>
                  {editingIdentity ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-foreground">National ID</label>
                  <Input value={editingIdentity ? identityForm.national_id : (studentProfile.national_id || "Not provided")} disabled={!editingIdentity} onChange={e => setIdentityForm({ ...identityForm, national_id: e.target.value })} /></div>
                <div><label className="text-sm font-medium text-foreground">Birth Certificate No.</label>
                  <Input value={editingIdentity ? identityForm.birth_cert_number : (studentProfile.birth_cert_number || "Not provided")} disabled={!editingIdentity} onChange={e => setIdentityForm({ ...identityForm, birth_cert_number: e.target.value })} /></div>
                <div><label className="text-sm font-medium text-foreground">Date of Birth</label>
                  <Input type={editingIdentity ? "date" : "text"} value={editingIdentity ? identityForm.date_of_birth : (studentProfile.date_of_birth || "Not provided")} disabled={!editingIdentity} onChange={e => setIdentityForm({ ...identityForm, date_of_birth: e.target.value })} /></div>
                <div><label className="text-sm font-medium text-foreground">Guardian Name</label>
                  <Input value={editingIdentity ? identityForm.guardian_name : (studentProfile.guardian_name || "Not provided")} disabled={!editingIdentity} onChange={e => setIdentityForm({ ...identityForm, guardian_name: e.target.value })} /></div>
                <div><label className="text-sm font-medium text-foreground">Guardian Phone</label>
                  <Input value={editingIdentity ? identityForm.guardian_phone : (studentProfile.guardian_phone || "Not provided")} disabled={!editingIdentity} onChange={e => setIdentityForm({ ...identityForm, guardian_phone: e.target.value })} /></div>
                <div><label className="text-sm font-medium text-foreground">Guardian Email</label>
                  <Input value={editingIdentity ? identityForm.guardian_email : (studentProfile.guardian_email || "Not provided")} disabled={!editingIdentity} onChange={e => setIdentityForm({ ...identityForm, guardian_email: e.target.value })} /></div>
                <div><label className="text-sm font-medium text-foreground">Address</label>
                  <Input value={editingIdentity ? identityForm.address : (studentProfile.address || "Not provided")} disabled={!editingIdentity} onChange={e => setIdentityForm({ ...identityForm, address: e.target.value })} /></div>
                <div><label className="text-sm font-medium text-foreground">Emergency Contact</label>
                  <Input value={editingIdentity ? identityForm.emergency_contact : (studentProfile.emergency_contact || "Not provided")} disabled={!editingIdentity} onChange={e => setIdentityForm({ ...identityForm, emergency_contact: e.target.value })} /></div>
                <div><label className="text-sm font-medium text-foreground">Emergency Phone</label>
                  <Input value={editingIdentity ? identityForm.emergency_phone : (studentProfile.emergency_phone || "Not provided")} disabled={!editingIdentity} onChange={e => setIdentityForm({ ...identityForm, emergency_phone: e.target.value })} /></div>
              </div>
              {editingIdentity && (
                <Button className="mt-4" onClick={handleSaveIdentity} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Identity & Guardian"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {studentProfile && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Heart className="w-5 h-5" /> Medical Information</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setEditingMedical(!editingMedical)}>
                  {editingMedical ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-sm font-medium text-foreground">Blood Type</label>
                  <Input value={editingMedical ? medicalForm.blood_type : (studentProfile.blood_type || "Not recorded")} disabled={!editingMedical} onChange={e => setMedicalForm({ ...medicalForm, blood_type: e.target.value })} /></div>
                <div><label className="text-sm font-medium text-foreground">Allergies</label>
                  <Input value={editingMedical ? medicalForm.allergies : (studentProfile.allergies || "None recorded")} disabled={!editingMedical} onChange={e => setMedicalForm({ ...medicalForm, allergies: e.target.value })} /></div>
                <div className="md:col-span-2"><label className="text-sm font-medium text-foreground">Medical Conditions</label>
                  <Input value={editingMedical ? medicalForm.medical_conditions : (studentProfile.medical_conditions || "None recorded")} disabled={!editingMedical} onChange={e => setMedicalForm({ ...medicalForm, medical_conditions: e.target.value })} /></div>
              </div>
              {editingMedical && (
                <Button className="mt-4" onClick={handleSaveMedical} disabled={saving}>
                  <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Medical Info"}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentProfile;
