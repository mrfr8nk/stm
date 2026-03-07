import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User, Save, Briefcase, Shield } from "lucide-react";

const TeacherProfile = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState("");
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setFullName(profile.full_name || "");
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase.from("teacher_profiles").select("*").eq("user_id", user.id).single()
      .then(({ data }) => setTeacherProfile(data));
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

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6 max-w-3xl">
        <h1 className="font-display text-2xl font-bold text-foreground">Account Settings</h1>

        {/* Avatar & Info Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-3xl font-bold">
                {(profile?.full_name || "T").charAt(0)}
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{profile?.full_name || "Teacher"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Shield className="w-3 h-3 text-primary" />
                  <span className="text-xs font-medium text-primary">Teacher</span>
                  {teacherProfile?.employee_id && (
                    <span className="text-xs font-mono text-muted-foreground ml-2">ID: {teacherProfile.employee_id}</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input value={user?.email || ""} disabled />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Phone</label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+263..." />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Professional Info */}
        {teacherProfile && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Briefcase className="w-5 h-5" /> Professional Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Department</label>
                  <Input value={teacherProfile.department || "Not assigned"} disabled />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Qualification</label>
                  <Input value={teacherProfile.qualification || "Not provided"} disabled />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Date Joined</label>
                  <Input value={teacherProfile.date_joined || "Not recorded"} disabled />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Subjects Taught</label>
                  <Input value={teacherProfile.subjects_taught?.join(", ") || "Not assigned"} disabled />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeacherProfile;
