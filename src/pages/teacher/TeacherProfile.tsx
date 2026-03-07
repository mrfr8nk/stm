import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { User, Save } from "lucide-react";

const TeacherProfile = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, phone }).eq("user_id", user.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile Updated" });
    }
    setSaving(false);
  };

  return (
    <DashboardLayout role="teacher">
      <div className="space-y-6 max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-foreground">My Profile</h1>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="w-5 h-5" /> Profile Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Full Name</label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input value={profile?.email || ""} disabled />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Phone</label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+263..." />
            </div>
            <Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Changes"}</Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TeacherProfile;
