import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User, Save, GraduationCap, Heart, Shield } from "lucide-react";

const StudentProfile = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState("");
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) setFullName(profile.full_name || "");
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase.from("student_profiles").select("*").eq("user_id", user.id).single()
      .then(({ data }) => setStudentProfile(data));
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
    <DashboardLayout role="student">
      <div className="space-y-6 max-w-3xl">
        <h1 className="font-display text-2xl font-bold text-foreground">Account Settings</h1>

        {/* Avatar & Info Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-3xl font-bold">
                {(profile?.full_name || "S").charAt(0)}
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{profile?.full_name || "Student"}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                {studentProfile && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      Form {studentProfile.form}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                      {studentProfile.level?.replace("_", " ").toUpperCase()}
                    </span>
                    {studentProfile.student_id && (
                      <span className="text-xs font-mono text-muted-foreground">ID: {studentProfile.student_id}</span>
                    )}
                  </div>
                )}
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
              {studentProfile?.date_of_birth && (
                <div>
                  <label className="text-sm font-medium text-foreground">Date of Birth</label>
                  <Input value={studentProfile.date_of_birth} disabled />
                </div>
              )}
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Identity & Guardian */}
        {studentProfile && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Identity & Guardian</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">National ID</label>
                  <Input value={studentProfile.national_id || "Not provided"} disabled />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Birth Certificate No.</label>
                  <Input value={studentProfile.birth_cert_number || "Not provided"} disabled />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Guardian Name</label>
                  <Input value={studentProfile.guardian_name || "Not provided"} disabled />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Guardian Phone</label>
                  <Input value={studentProfile.guardian_phone || "Not provided"} disabled />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Address</label>
                  <Input value={studentProfile.address || "Not provided"} disabled />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Emergency Contact</label>
                  <Input value={studentProfile.emergency_contact || "Not provided"} disabled />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Medical Info */}
        {studentProfile && (
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Heart className="w-5 h-5" /> Medical Information</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Blood Type</label>
                  <Input value={studentProfile.blood_type || "Not recorded"} disabled />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Allergies</label>
                  <Input value={studentProfile.allergies || "None recorded"} disabled />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-foreground">Medical Conditions</label>
                  <Input value={studentProfile.medical_conditions || "None recorded"} disabled />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentProfile;
