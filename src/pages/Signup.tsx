import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, GraduationCap, BookOpen, Shield, Send, Loader2, CheckCircle, Users, Mail, KeyRound } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import PhoneInput from "@/components/PhoneInput";

type SignupRole = "student" | "teacher" | "parent" | "admin";

const roleConfig: Record<SignupRole, { label: string; icon: React.ElementType; description: string; color: string; bgColor: string; requiresCode: boolean }> = {
  student: { label: "Student", icon: GraduationCap, description: "Join as a student — verify with email", color: "text-accent", bgColor: "bg-accent/10 border-accent/30", requiresCode: false },
  teacher: { label: "Teacher", icon: BookOpen, description: "Join as a teacher — access code required", color: "text-secondary", bgColor: "bg-secondary/10 border-secondary/30", requiresCode: true },
  parent: { label: "Parent", icon: Users, description: "Join as a parent — verify with email", color: "text-amber-600", bgColor: "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800", requiresCode: false },
  admin: { label: "Administrator", icon: Shield, description: "Register as admin — access code required", color: "text-primary", bgColor: "bg-primary/10 border-primary/30", requiresCode: true },
};

const Signup = () => {
  const [selectedRole, setSelectedRole] = useState<SignupRole | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("o_level");
  const [selectedForm, setSelectedForm] = useState("1");
  const [phone, setPhone] = useState("");
  const [childStudentId, setChildStudentId] = useState("");
  const [childLookupResult, setChildLookupResult] = useState<string | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [address, setAddress] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [gender, setGender] = useState("");

  // OTP verification state
  const [otpStep, setOtpStep] = useState<"form" | "otp" | "done">("form");
  const [otpCode, setOtpCode] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpResendTimer, setOtpResendTimer] = useState(0);

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("classes").select("*").is("deleted_at", null).order("form").order("name")
      .then(({ data }) => setClasses(data || []));
  }, []);

  // Resend timer
  useEffect(() => {
    if (otpResendTimer > 0) {
      const t = setTimeout(() => setOtpResendTimer(otpResendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [otpResendTimer]);

  const filteredClasses = useMemo(() =>
    classes.filter(c => c.level === selectedLevel && c.form === parseInt(selectedForm)),
    [classes, selectedLevel, selectedForm]
  );

  const sendOtp = async () => {
    setOtpSending(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-branded-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), type: 'verification_otp', full_name: fullName }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to send verification code');
      toast({ title: "Code Sent!", description: `A verification code has been sent to ${email}` });
      setOtpStep("otp");
      setOtpResendTimer(60);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtpAndSignup = async () => {
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      toast({ title: "Invalid Code", description: "Please enter the 6-digit code.", variant: "destructive" });
      return;
    }
    setOtpVerifying(true);

    try {
      // Verify OTP
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp_code: otpCode.trim() }),
      });
      const result = await res.json();
      if (!result.valid) {
        toast({ title: "Verification Failed", description: result.error || "Invalid code.", variant: "destructive" });
        setOtpVerifying(false);
        return;
      }

      // OTP verified — create the account
      await createAccount();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setOtpVerifying(false);
    }
  };

  const createAccount = async () => {
    if (!selectedRole) return;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    });

    if (authError || !authData.user) {
      toast({ title: "Signup Failed", description: authError?.message || "Could not create account.", variant: "destructive" });
      setOtpVerifying(false);
      setLoading(false);
      return;
    }

    // Assign role
    await supabase.from("user_roles").insert({ user_id: authData.user.id, role: selectedRole });

    if (selectedRole === "student") {
      await supabase.from("student_profiles").insert({
        user_id: authData.user.id,
        level: selectedLevel as any,
        form: parseInt(selectedForm),
        class_id: selectedClass || null,
        date_of_birth: dateOfBirth || null,
        gender: gender || null,
        guardian_name: guardianName || null,
        guardian_phone: guardianPhone || null,
        guardian_email: guardianEmail || null,
        address: address || null,
        national_id: nationalId || null,
      });
      if (phone) {
        await supabase.from("profiles").update({ phone }).eq("user_id", authData.user.id);
      }
    } else if (selectedRole === "parent") {
      if (phone) {
        // Wait briefly for the handle_new_user trigger to create the profile row
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { error: phoneErr } = await supabase.from("profiles").update({ phone }).eq("user_id", authData.user.id);
        if (phoneErr) {
          // Retry once more after another delay
          await new Promise(resolve => setTimeout(resolve, 1500));
          await supabase.from("profiles").update({ phone }).eq("user_id", authData.user.id);
        }
      }
      if (childStudentId.trim()) {
        const { data: studentProfile } = await supabase
          .from("student_profiles")
          .select("user_id, guardian_phone, guardian_email")
          .eq("student_id", childStudentId.trim())
          .single();
        if (studentProfile) {
          const parentLast9 = phone.replace(/\D/g, "").slice(-9);
          const guardianLast9 = (studentProfile.guardian_phone || "").replace(/\D/g, "").slice(-9);
          const phoneMatch = parentLast9.length >= 9 && guardianLast9.length >= 9 && parentLast9 === guardianLast9;
          const parentEmail = email.trim().toLowerCase();
          const studentGuardianEmail = (studentProfile.guardian_email || "").trim().toLowerCase();
          const emailMatch = parentEmail && studentGuardianEmail && parentEmail === studentGuardianEmail;
          if (phoneMatch || emailMatch) {
            await supabase.from("parent_student_links").insert({
              parent_id: authData.user.id,
              student_id: studentProfile.user_id,
            });
            // Notify the student
            await supabase.from("notifications").insert({
              user_id: studentProfile.user_id,
              title: "🔗 Parent Account Linked",
              message: `${fullName} has linked to your account as a parent/guardian. They can now view your grades, attendance, and fee records.`,
              type: "parent_link",
              metadata: { parent_id: authData.user.id, parent_name: fullName },
            });
          } else {
            toast({
              title: "Child Not Linked",
              description: "Your phone/email doesn't match guardian info. Request linking through the admin.",
              variant: "destructive"
            });
          }
        }
      }
    }

    setOtpStep("done");
    setOtpVerifying(false);
    setLoading(false);
    toast({ title: "Account Created!", description: "Welcome to St. Mary's. You can now log in." });
    setTimeout(() => navigate("/login", { replace: true }), 2000);
  };

  // Access code signup for teacher/admin
  const handleCodeSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setLoading(true);

    const { data: codeData, error: codeError } = await supabase
      .from("access_codes").select("*").eq("code", accessCode.trim()).is("deleted_at", null).single();

    if (codeError || !codeData) {
      toast({ title: "Invalid Access Code", description: "The code is invalid, expired, or already used.", variant: "destructive" });
      setLoading(false);
      return;
    }
    const useCount = (codeData as any).use_count ?? (codeData.used ? 1 : 0);
    const maxUses = (codeData as any).max_uses ?? 1;
    if (useCount >= maxUses) {
      toast({ title: "Code Fully Used", description: "This access code has reached its usage limit.", variant: "destructive" });
      setLoading(false);
      return;
    }
    if (codeData.role !== selectedRole) {
      toast({ title: "Wrong Code Type", description: `This code is for ${codeData.role}s, not ${selectedRole}s.`, variant: "destructive" });
      setLoading(false);
      return;
    }
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      toast({ title: "Code Expired", description: "This access code has expired.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    });

    if (authError || !authData.user) {
      toast({ title: "Signup Failed", description: authError?.message || "Could not create account.", variant: "destructive" });
      setLoading(false);
      return;
    }

    await supabase.from("user_roles").insert({ user_id: authData.user.id, role: codeData.role });
    const newUseCount = useCount + 1;
    await supabase.from("access_codes").update({
      used: newUseCount >= maxUses,
      used_by: authData.user.id,
      use_count: newUseCount,
    } as any).eq("id", codeData.id);

    if (codeData.role === "teacher") {
      await supabase.from("teacher_profiles").insert({ user_id: authData.user.id });
    }

    toast({ title: "Account Created!", description: "Welcome to St. Mary's. You can now log in." });
    navigate("/login", { replace: true });
    setLoading(false);
  };

  // Handle student/parent email verification submit
  const handleEmailVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast({ title: "Required", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    await sendOtp();
  };

  const studentPersonalFields = (
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

  const classSelectField = (
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
            {classes.length === 0
              ? "No classes have been set up yet. Please contact the school administration."
              : `No classes found for ${selectedLevel.replace("_", " ").toUpperCase()} Form ${selectedForm}. Try a different level or form.`}
          </p>
        </div>
      )}
    </div>
  );

  const parentChildLinkFields = (
    <div className="border-t border-border pt-3 space-y-3">
      <p className="text-sm font-semibold text-foreground">Link to Your Child (Optional)</p>
      <p className="text-xs text-muted-foreground">Enter your child's Student ID to auto-link. Your phone or email must match the guardian info on the student's profile.</p>
      <div>
        <label className="text-sm font-medium text-foreground">Child's Student ID</label>
        <Input
          placeholder="e.g. STM20260001"
          value={childStudentId}
          onChange={async (e) => {
            const val = e.target.value;
            setChildStudentId(val);
            setChildLookupResult(null);
            if (val.trim().length >= 3) {
              const { data } = await supabase
                .from("student_profiles")
                .select("user_id, student_id, form, level")
                .eq("student_id", val.trim())
                .single();
              if (data) {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("full_name")
                  .eq("user_id", data.user_id)
                  .single();
                setChildLookupResult(profile?.full_name ? `✓ Found: ${profile.full_name} (Form ${data.form})` : `✓ Student found (Form ${data.form})`);
              } else {
                setChildLookupResult("✗ No student found with this ID");
              }
            }
          }}
        />
        {childLookupResult && (
          <p className={`text-xs mt-1 ${childLookupResult.startsWith("✓") ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
            {childLookupResult}
          </p>
        )}
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">Phone Number</label>
        <PhoneInput value={phone} onChange={setPhone} />
      </div>
    </div>
  );

  // OTP verification screen
  if (otpStep === "otp") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img src={schoolLogo} alt="St. Mary's" className="h-20 w-20 object-contain mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold text-primary">Verify Your Email</h1>
          </div>
          <Card className="shadow-card border-2">
            <CardContent className="pt-6 space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4">
                  <Mail className="h-8 w-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  We've sent a 6-digit verification code to
                </p>
                <p className="font-semibold text-foreground mt-1">{email}</p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Verification Code</label>
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="text-center text-2xl tracking-[0.5em] font-mono h-14"
                  maxLength={6}
                  autoFocus
                />
              </div>

              <Button
                className="w-full h-12"
                onClick={verifyOtpAndSignup}
                disabled={otpVerifying || otpCode.length !== 6}
              >
                {otpVerifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</> : "Verify & Create Account"}
              </Button>

              <div className="text-center space-y-2">
                <p className="text-xs text-muted-foreground">Didn't receive the code? Check spam/junk folder.</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={sendOtp}
                  disabled={otpResendTimer > 0 || otpSending}
                >
                  {otpResendTimer > 0 ? `Resend in ${otpResendTimer}s` : otpSending ? "Sending..." : "Resend Code"}
                </Button>
              </div>

              <button
                onClick={() => { setOtpStep("form"); setOtpCode(""); }}
                className="text-sm text-muted-foreground hover:text-foreground w-full text-center"
              >
                ← Back to registration
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success screen
  if (otpStep === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="max-w-md w-full text-center py-8">
          <CardContent>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Account Created!</h2>
            <p className="text-muted-foreground mb-4">Your email has been verified and your account is ready.</p>
            <p className="text-sm text-muted-foreground mb-6">Redirecting you to login...</p>
            <Link to="/login" className="text-sm text-primary hover:underline">Go to Login now</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4">
            <img src={schoolLogo} alt="St. Mary's" className="h-20 w-20 object-contain mx-auto" />
          </Link>
          <h1 className="font-display text-3xl font-bold text-primary">Create Account</h1>
          <p className="text-muted-foreground mt-2">Select your role to get started</p>
        </div>

        {!selectedRole ? (
          <div className="space-y-4">
            {(["student", "parent", "teacher", "admin"] as SignupRole[]).map((role) => {
              const config = roleConfig[role];
              return (
                <Card key={role} className={`cursor-pointer transition-all hover:shadow-card-hover border-2 hover:scale-[1.02] ${config.bgColor}`} onClick={() => setSelectedRole(role)}>
                  <CardContent className="flex items-center gap-5 p-6">
                    <div className={`p-4 rounded-xl bg-card shadow-sm ${config.color}`}><config.icon className="w-8 h-8" /></div>
                    <div className="flex-1">
                      <p className="font-display text-xl font-bold text-foreground">Sign Up as {config.label}</p>
                      <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
                    </div>
                    {config.requiresCode ? (
                      <KeyRound className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Mail className="w-5 h-5 text-muted-foreground" />
                    )}
                  </CardContent>
                </Card>
              );
            })}
            <div className="flex items-center gap-4 justify-center mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> Email verification</div>
              <div className="flex items-center gap-1"><KeyRound className="w-3 h-3" /> Access code required</div>
            </div>
            <div className="text-center mt-4 space-y-2">
              <Link to="/login" className="text-sm text-primary hover:underline">Already have an account? Sign in</Link>
              <Link to="/" className="text-sm text-muted-foreground hover:underline block">← Back to website</Link>
            </div>
          </div>
        ) : (
          <div>
            <button onClick={() => { setSelectedRole(null); setOtpStep("form"); setOtpCode(""); }} className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">← Choose different role</button>

            {/* Student — email OTP verification */}
            {selectedRole === "student" && (
              <Card className={`shadow-card border-2 ${roleConfig.student.bgColor}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg bg-card shadow-sm ${roleConfig.student.color}`}><GraduationCap className="w-6 h-6" /></div>
                    <div>
                      <CardTitle>Student Registration</CardTitle>
                      <CardDescription>Verify your email to create an account</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleEmailVerifySubmit} className="space-y-4">
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground flex items-start gap-2">
                      <Mail className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                      <span>A verification code will be sent to your email to confirm your identity.</span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Full Name *</label>
                      <Input placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} required />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Email *</label>
                      <Input type="email" placeholder="your.email@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Password *</label>
                      <Input type="password" placeholder="Minimum 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                    </div>
                    {studentPersonalFields}
                    {classSelectField}
                    <Button type="submit" className="w-full" disabled={otpSending}>
                      {otpSending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending Code...</> : <><Mail className="w-4 h-4 mr-2" /> Verify Email & Register</>}
                    </Button>
                    <div className="relative my-2">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                    </div>
                    <Button type="button" variant="outline" className="w-full" onClick={async () => {
                      const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
                      if (error) toast({ title: "Google Sign-Up Failed", description: error.message || "Could not sign up with Google.", variant: "destructive" });
                    }}>
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                      Sign up with Google
                    </Button>
                  </form>
                  <div className="mt-4 text-center">
                    <Link to="/login" className="text-sm text-primary hover:underline">Already have an account? Sign in</Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Parent — email OTP verification */}
            {selectedRole === "parent" && (
              <Card className={`shadow-card border-2 ${roleConfig.parent.bgColor}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg bg-card shadow-sm ${roleConfig.parent.color}`}><Users className="w-6 h-6" /></div>
                    <div>
                      <CardTitle>Parent Registration</CardTitle>
                      <CardDescription>Verify your email to create an account</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleEmailVerifySubmit} className="space-y-4">
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground flex items-start gap-2">
                      <Mail className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                      <span>A verification code will be sent to your email to confirm your identity. No access code needed!</span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Full Name *</label>
                      <Input placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} required />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Email *</label>
                      <Input type="email" placeholder="your.email@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Password *</label>
                      <Input type="password" placeholder="Minimum 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                    </div>
                    {parentChildLinkFields}
                    <Button type="submit" className="w-full" disabled={otpSending}>
                      {otpSending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending Code...</> : <><Mail className="w-4 h-4 mr-2" /> Verify Email & Register</>}
                    </Button>
                    <div className="relative my-2">
                      <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                      <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                    </div>
                    <Button type="button" variant="outline" className="w-full" onClick={async () => {
                      const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
                      if (error) toast({ title: "Google Sign-Up Failed", description: error.message || "Could not sign up with Google.", variant: "destructive" });
                    }}>
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                      Sign up with Google
                    </Button>
                  </form>
                  <div className="mt-4 text-center">
                    <Link to="/login" className="text-sm text-primary hover:underline">Already have an account? Sign in</Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Teacher & Admin — access code required */}
            {(selectedRole === "teacher" || selectedRole === "admin") && (
              <Card className={`shadow-card border-2 ${roleConfig[selectedRole].bgColor}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg bg-card shadow-sm ${roleConfig[selectedRole].color}`}>
                      {(() => { const Icon = roleConfig[selectedRole].icon; return <Icon className="w-6 h-6" />; })()}
                    </div>
                    <div>
                      <CardTitle>{roleConfig[selectedRole].label} Registration</CardTitle>
                      <CardDescription>You need a {selectedRole} access code from administration</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCodeSignup} className="space-y-4">
                    <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground flex items-start gap-2">
                      <KeyRound className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>An access code from the school administration is required to register as a {selectedRole}.</span>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Access Code *</label>
                      <Input placeholder="Enter your access code" value={accessCode} onChange={e => setAccessCode(e.target.value)} required autoFocus />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Full Name *</label>
                      <Input placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} required />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Email *</label>
                      <Input type="email" placeholder="your.email@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Password *</label>
                      <Input type="password" placeholder="Minimum 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creating account..." : `Create ${roleConfig[selectedRole].label} Account`}
                    </Button>
                  </form>
                  <div className="mt-4 text-center">
                    <Link to="/login" className="text-sm text-primary hover:underline">Already have an account? Sign in</Link>
                  </div>
                </CardContent>
              </Card>
            )}

            <Link to="/" className="text-sm text-muted-foreground hover:underline block text-center mt-4">← Back to website</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Signup;
