import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User, Save } from "lucide-react";

const StudentProfile = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState("");
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("student_profiles").select("*").eq("user_id", user.id).single()
      .then(({ data }) => setStudentProfile(data));
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").update({ full_name: fullName, phone }).eq("user_id", user.id);
    toast({ title: "Profile Updated" });
    setSaving(false);
  };

  return (
    <DashboardLayout role="student">
      <div className="space-y-6 max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-foreground">My Profile</h1>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Personal Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><label className="text-sm font-medium">Full Name</label><Input value={fullName} onChange={e => setFullName(e.target.value)} /></div>
            <div><label className="text-sm font-medium">Email</label><Input value={profile?.email || ""} disabled /></div>
            <div><label className="text-sm font-medium">Phone</label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+263..." /></div>
            {studentProfile && (
              <>
                <div><label className="text-sm font-medium">Student ID</label><Input value={studentProfile.student_id || "Not assigned"} disabled /></div>
                <div><label className="text-sm font-medium">Form</label><Input value={`Form ${studentProfile.form}`} disabled /></div>
                <div><label className="text-sm font-medium">Level</label><Input value={studentProfile.level?.replace("_", " ").toUpperCase()} disabled /></div>
              </>
            )}
            <Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentProfile;
