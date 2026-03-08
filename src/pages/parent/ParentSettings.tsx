import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import AvatarUpload from "@/components/AvatarUpload";
import PhoneInput, { normalizePhone } from "@/components/PhoneInput";
import { Settings, Unlink, UserPlus, Link2, Loader2, AlertCircle, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const ParentSettings = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Link child state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [childStudentId, setChildStudentId] = useState("");
  const [childLookup, setChildLookup] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  // Unlink confirm
  const [unlinkId, setUnlinkId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone((profile as any).phone || "");
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const fetchChildren = async () => {
    if (!user) return;
    setLoading(true);
    const { data: links } = await supabase
      .from("parent_student_links")
      .select("id, student_id")
      .eq("parent_id", user.id);

    if (links && links.length > 0) {
      const studentIds = links.map(l => l.student_id);
      const [profiles, studentProfiles] = await Promise.all([
        supabase.from("profiles").select("*").in("user_id", studentIds),
        supabase.from("student_profiles").select("*, classes(name)").in("user_id", studentIds),
      ]);
      const merged = links.map(link => ({
        linkId: link.id,
        studentId: link.student_id,
        profile: (profiles.data || []).find(p => p.user_id === link.student_id),
        student: (studentProfiles.data || []).find(s => s.user_id === link.student_id),
      }));
      setChildren(merged);
    } else {
      setChildren([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchChildren();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      avatar_url: avatarUrl,
    }).eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile Updated", description: "Your profile has been saved." });
    }
  };

  const handleUnlink = async () => {
    if (!unlinkId) return;
    const { error } = await supabase.from("parent_student_links").delete().eq("id", unlinkId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Child Unlinked", description: "The child has been removed from your account." });
      fetchChildren();
    }
    setUnlinkId(null);
  };

  const sendLinkNotification = async (studentUserId: string, parentName: string) => {
    try {
      await supabase.from("notifications").insert({
        user_id: studentUserId,
        title: "🔗 Parent Account Linked",
        message: `${parentName} has linked to your account as a parent/guardian. They can now view your grades, attendance, and fee records.`,
        type: "parent_link",
        metadata: { parent_id: user?.id, parent_name: parentName },
      });
    } catch (err) {
      console.error("Failed to send link notification:", err);
    }
  };

  const handleLinkChild = async () => {
    if (!user || !childStudentId.trim()) return;
    setLinking(true);

    const { data: studentProfile } = await supabase
      .from("student_profiles")
      .select("user_id, guardian_phone, guardian_email")
      .eq("student_id", childStudentId.trim())
      .single();

    if (!studentProfile) {
      toast({ title: "Not Found", description: "No student found with that ID.", variant: "destructive" });
      setLinking(false);
      return;
    }

    // Check if already linked
    const existing = children.find(c => c.studentId === studentProfile.user_id);
    if (existing) {
      toast({ title: "Already Linked", description: "This child is already linked to your account.", variant: "destructive" });
      setLinking(false);
      return;
    }

    // Verify guardian info - normalize both numbers for comparison
    const parentPhone = phone.trim().replace(/[\s\-\(\)]/g, "");
    const parentEmail = user.email?.trim().toLowerCase() || "";
    const studentGuardianPhone = (studentProfile.guardian_phone || "").trim().replace(/[\s\-\(\)]/g, "");
    const studentGuardianEmail = (studentProfile.guardian_email || "").trim().toLowerCase();

    // Compare last 9 digits for phone match (handles different country code formats)
    const parentLast9 = parentPhone.replace(/\D/g, "").slice(-9);
    const guardianLast9 = studentGuardianPhone.replace(/\D/g, "").slice(-9);
    const phoneMatch = parentLast9.length >= 9 && guardianLast9.length >= 9 && parentLast9 === guardianLast9;
    const emailMatch = parentEmail && studentGuardianEmail && parentEmail === studentGuardianEmail;

    if (!phoneMatch && !emailMatch) {
      toast({
        title: "Verification Failed",
        description: "Your phone or email doesn't match the guardian info on the student's profile. Please contact the school admin to link manually.",
        variant: "destructive",
      });
      setLinking(false);
      return;
    }

    const { error } = await supabase.from("parent_student_links").insert({
      parent_id: user.id,
      student_id: studentProfile.user_id,
    });

    setLinking(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      const parentName = fullName || profile?.full_name || "A parent";
      // Send in-app notification to the student
      await sendLinkNotification(studentProfile.user_id, parentName);

      // Get student profile info for emails
      const { data: studentProf } = await supabase.from("profiles").select("full_name, email").eq("user_id", studentProfile.user_id).single();
      const { data: studentDetail } = await supabase.from("student_profiles").select("classes(name)").eq("user_id", studentProfile.user_id).single();
      const studentName = studentProf?.full_name || "Student";
      const studentEmail = studentProf?.email;
      const className = (studentDetail as any)?.classes?.name;
      const linkDate = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

      const linkData = { parentName, studentName, className, date: linkDate };

      // Send branded email to student
      if (studentEmail) {
        supabase.functions.invoke("send-branded-email", {
          body: { email: studentEmail, type: "parent_link", link_data: { ...linkData, role: "student" } },
        }).catch(() => {});
      }

      // Send branded email to parent
      if (user?.email) {
        supabase.functions.invoke("send-branded-email", {
          body: { email: user.email, type: "parent_link", link_data: { ...linkData, role: "parent" } },
        }).catch(() => {});
      }

      toast({ title: "Child Linked!", description: "Both you and the student have been notified via email." });
      setChildStudentId("");
      setChildLookup(null);
      setLinkDialogOpen(false);
      fetchChildren();
    }
  };

  const lookupStudent = async (val: string) => {
    setChildStudentId(val);
    setChildLookup(null);
    if (val.trim().length >= 3) {
      const { data } = await supabase
        .from("student_profiles")
        .select("user_id, student_id, form, level")
        .eq("student_id", val.trim())
        .single();
      if (data) {
        const { data: p } = await supabase.from("profiles").select("full_name").eq("user_id", data.user_id).single();
        setChildLookup(p?.full_name ? `✓ Found: ${p.full_name} (Form ${data.form})` : `✓ Student found (Form ${data.form})`);
      } else {
        setChildLookup("✗ No student found with this ID");
      }
    }
  };

  return (
    <DashboardLayout role="parent">
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-6 h-6" /> Parent Settings
          </h1>
          <p className="text-sm text-muted-foreground">Manage your profile and linked children</p>
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Profile</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <AvatarUpload
                currentUrl={avatarUrl}
                onUploaded={(url) => setAvatarUrl(url)}
                userId={user?.id || ""}
                name={fullName}
              />
              <div className="flex-1 space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground">Full Name</label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Phone</label>
                  <PhoneInput value={phone} onChange={setPhone} />
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <Input value={user?.email || ""} disabled className="bg-muted/50" />
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Profile
            </Button>
          </CardContent>
        </Card>

        {/* Linked Children Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><Link2 className="w-5 h-5" /> Linked Children</CardTitle>
              <Button size="sm" onClick={() => setLinkDialogOpen(true)}>
                <UserPlus className="w-4 h-4 mr-1" /> Link Child
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : children.length === 0 ? (
              <div className="text-center py-6">
                <AlertCircle className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No children linked to your account.</p>
                <p className="text-xs text-muted-foreground mt-1">Click "Link Child" to add your child using their Student ID.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {children.map(child => (
                  <div key={child.linkId} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3">
                      {child.profile?.avatar_url ? (
                        <img src={child.profile.avatar_url} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                          {(child.profile?.full_name || "S").charAt(0)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-foreground">{child.profile?.full_name || "Student"}</p>
                        <p className="text-xs text-muted-foreground">
                          {child.student?.student_id && <span className="mr-2">{child.student.student_id}</span>}
                          {child.student?.classes?.name || `Form ${child.student?.form}`}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setUnlinkId(child.linkId)}>
                      <Unlink className="w-4 h-4 mr-1" /> Unlink
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Unlink Confirm Dialog */}
        <Dialog open={!!unlinkId} onOpenChange={() => setUnlinkId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unlink Child?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to unlink this child from your account? You will no longer be able to view their grades, attendance, or fees. You can re-link them later.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUnlinkId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleUnlink}>Unlink</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Link Child Dialog */}
        <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Link a Child</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground mb-3">
              Enter your child's Student ID. Your phone number or email must match the guardian information on the student's profile for verification.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Child's Student ID</label>
                <Input
                  placeholder="e.g. STM20260001"
                  value={childStudentId}
                  onChange={e => lookupStudent(e.target.value)}
                />
                {childLookup && (
                  <p className={`text-xs mt-1 ${childLookup.startsWith("✓") ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                    {childLookup}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setLinkDialogOpen(false); setChildStudentId(""); setChildLookup(null); }}>Cancel</Button>
              <Button onClick={handleLinkChild} disabled={linking || !childLookup?.startsWith("✓")}>
                {linking ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1" />}
                Link Child
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ParentSettings;
