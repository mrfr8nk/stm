import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertCircle, GraduationCap, BookOpen, Users, Shield, KeyRound, User, Mail, Phone } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import PhoneInput from "@/components/PhoneInput";

type InviteData = {
  id: string;
  email: string;
  role: "student" | "teacher" | "parent" | "admin";
  class_id: string | null;
  form: number | null;
  level: string | null;
  expires_at: string;
};

const roleConfig = {
  student: { label: "Student", icon: GraduationCap, color: "text-accent", bgColor: "bg-accent/10 border-accent/30" },
  teacher: { label: "Teacher", icon: BookOpen, color: "text-secondary", bgColor: "bg-secondary/10 border-secondary/30" },
  parent: { label: "Parent", icon: Users, color: "text-amber-600", bgColor: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800" },
  admin: { label: "Administrator", icon: Shield, color: "text-primary", bgColor: "bg-primary/10 border-primary/30" },
};

const ActivateAccount = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [address, setAddress] = useState("");

  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("o_level");
  const [selectedForm, setSelectedForm] = useState("1");

  const [activating, setActivating] = useState(false);
  const [success, setSuccess] = useState(false);

  // Validate the invite token
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError("No activation token provided.");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("pending_invitations")
        .select("*")
        .eq("invite_token", token)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (fetchError || !data) {
        setError("This activation link is invalid or has expired.");
        setLoading(false);
        return;
      }

      setInviteData(data as InviteData);

      // Pre-fill form and class if provided
      if (data.class_id) setSelectedClass(data.class_id);
      if (data.form) setSelectedForm(String(data.form));
      if (data.level) setSelectedLevel(data.level);

      setLoading(false);
    };

    validateToken();
  }, [token]);

  // Fetch classes for students
  useEffect(() => {
    if (inviteData?.role === "student") {
      supabase.from("classes").select("*").is("deleted_at", null).order("form").order("name")
        .then(({ data }) => setClasses(data || []));
    }
  }, [inviteData?.role]);

  const filteredClasses = useMemo(() =>
    classes.filter(c => c.level === selectedLevel && c.form === parseInt(selectedForm)),
    [classes, selectedLevel, selectedForm]
  );

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteData) return;

    // Validation
    if (!fullName.trim()) {
      toast({ title: "Required", description: "Please enter your full name.", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Passwords Don't Match", description: "Please make sure your passwords match.", variant: "destructive" });
      return;
    }

    if (inviteData.role === "student" && !selectedClass && filteredClasses.length > 0) {
      toast({ title: "Class Required", description: "Please select your class.", variant: "destructive" });
      return;
    }

    setActivating(true);

    try {
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: inviteData.email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || "Could not create account.");
      }

      // Assign role
      await supabase.from("user_roles").insert({ user_id: authData.user.id, role: inviteData.role });

      // Update profile with phone if provided
      if (phone) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for trigger to create profile
        await supabase.from("profiles").update({ phone }).eq("user_id", authData.user.id);
      }

      // Create role-specific profile
      if (inviteData.role === "student") {
        await supabase.from("student_profiles").insert({
          user_id: authData.user.id,
          level: selectedLevel as any,
          form: parseInt(selectedForm),
          class_id: selectedClass || inviteData.class_id || null,
          date_of_birth: dateOfBirth || null,
          gender: gender || null,
          guardian_name: guardianName || null,
          guardian_phone: guardianPhone || null,
          guardian_email: guardianEmail || null,
          address: address || null,
          national_id: nationalId || null,
        });
      } else if (inviteData.role === "teacher") {
        await supabase.from("teacher_profiles").insert({ user_id: authData.user.id });
      }

      // Mark invitation as used
      await supabase
        .from("pending_invitations")
        .update({ used_at: new Date().toISOString() })
        .eq("id", inviteData.id);

      // Send welcome email
      supabase.functions.invoke("send-branded-email", {
        body: { email: inviteData.email, type: "welcome", welcome_data: { name: fullName, role: inviteData.role } },
      }).catch(() => {});

      setSuccess(true);
      toast({ title: "Account Activated!", description: "Welcome to St. Mary's. You can now log in." });

      setTimeout(() => navigate("/login", { replace: true }), 3000);

    } catch (err: any) {
      toast({ title: "Activation Failed", description: err.message, variant: "destructive" });
    } finally {
      setActivating(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Validating activation link...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md shadow-card border-2">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Invalid Link</h2>
            <p className="text-muted-foreground">{error}</p>
            <div className="pt-4">
              <Link to="/login">
                <Button variant="outline">Back to Login</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md shadow-card border-2">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Account Activated!</h2>
            <p className="text-muted-foreground">Your account has been created successfully. Redirecting to login...</p>
            <div className="pt-4">
              <Link to="/login">
                <Button>Go to Login</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const RoleIcon = roleConfig[inviteData!.role].icon;

  // Student-specific fields
  const studentFields = inviteData?.role === "student" && (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-foreground">Phone</label>
          <PhoneInput value={phone} onChange={setPhone} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Date of Birth</label>
          <Input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-foreground">Sex</label>
          <select className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm" value={gender} onChange={e => setGender(e.target.value)}>
            <option value="">Select...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">National ID / Birth Cert No.</label>
          <Input placeholder="e.g. 63-123456A78" value={nationalId} onChange={e => setNationalId(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-foreground">Level</label>
          <select className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm" value={selectedLevel} onChange={e => { setSelectedLevel(e.target.value); setSelectedClass(""); setSelectedForm(e.target.value === "a_level" ? "5" : "1"); }}>
            <option value="zjc">ZJC (Form 1-2)</option>
            <option value="o_level">O Level (Form 1-4)</option>
            <option value="a_level">A Level (Form 5-6)</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Form</label>
          <select className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm" value={selectedForm} onChange={e => { setSelectedForm(e.target.value); setSelectedClass(""); }}>
            {(selectedLevel === "zjc" ? [1, 2] : selectedLevel === "o_level" ? [1, 2, 3, 4] : [5, 6]).map(f => <option key={f} value={f}>Form {f}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Class *</label>
        {filteredClasses.length > 0 ? (
          <select className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
            <option value="">Select class...</option>
            {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}{c.stream ? ` (${c.stream})` : ""}</option>)}
          </select>
        ) : (
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm">
            <p className="font-medium text-destructive">No classes available</p>
            <p className="text-xs text-muted-foreground mt-1">
              No classes found for {selectedLevel.replace("_", " ").toUpperCase()} Form {selectedForm}.
            </p>
          </div>
        )}
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Home Address</label>
        <Input placeholder="Full home address" value={address} onChange={e => setAddress(e.target.value)} />
      </div>
      <div className="border-t border-border pt-3">
        <p className="text-sm font-semibold text-foreground mb-2">Guardian / Parent Information</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-foreground">Guardian Name</label>
            <Input placeholder="Full name" value={guardianName} onChange={e => setGuardianName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Guardian Phone</label>
            <PhoneInput value={guardianPhone} onChange={setGuardianPhone} />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-sm font-medium text-foreground">Guardian Email</label>
          <Input type="email" placeholder="guardian@example.com" value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)} />
        </div>
      </div>
    </>
  );

  // Teacher/Parent/Admin - just phone
  const nonStudentFields = inviteData?.role !== "student" && (
    <div>
      <label className="text-sm font-medium text-foreground">Phone Number</label>
      <PhoneInput value={phone} onChange={setPhone} />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <img src={schoolLogo} alt="St. Mary's" className="h-20 w-20 object-contain mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-primary">Activate Your Account</h1>
          <p className="text-muted-foreground text-sm mt-1">Complete your registration to get started</p>
        </div>

        <Card className="shadow-card border-2">
          <CardHeader className="pb-4">
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${roleConfig[inviteData!.role].bgColor}`}>
              <RoleIcon className={`w-6 h-6 ${roleConfig[inviteData!.role].color}`} />
              <div>
                <CardTitle className="text-lg">{roleConfig[inviteData!.role].label} Account</CardTitle>
                <CardDescription className="text-xs">{inviteData!.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleActivate} className="space-y-4">
              {/* Required fields */}
              <div>
                <label className="text-sm font-medium text-foreground flex items-center gap-1">
                  <User className="w-4 h-4" /> Full Name *
                </label>
                <Input
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground flex items-center gap-1">
                  <KeyRound className="w-4 h-4" /> Password *
                </label>
                <Input
                  type="password"
                  placeholder="Create a password (min 6 characters)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Confirm Password *</label>
                <Input
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {/* Role-specific fields */}
              {studentFields}
              {nonStudentFields}

              <Button type="submit" className="w-full" disabled={activating}>
                {activating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Activating...</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Activate Account</>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Log in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ActivateAccount;
