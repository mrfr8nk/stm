import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, GraduationCap, BookOpen, Shield, Send, Loader2, CheckCircle } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";

type SignupRole = "student" | "teacher" | "admin";

const roleConfig: Record<SignupRole, { label: string; icon: React.ElementType; description: string; color: string; bgColor: string }> = {
  student: { label: "Student", icon: GraduationCap, description: "Join as a student to view grades & reports", color: "text-accent", bgColor: "bg-accent/10 border-accent/30" },
  teacher: { label: "Teacher", icon: BookOpen, description: "Join as a teacher to manage classes", color: "text-secondary", bgColor: "bg-secondary/10 border-secondary/30" },
  admin: { label: "Administrator", icon: Shield, description: "Register as an administrator with admin code", color: "text-primary", bgColor: "bg-primary/10 border-primary/30" },
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
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [address, setAddress] = useState("");
  const [previousSchool, setPreviousSchool] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);
  const [notes, setNotes] = useState("");

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("classes").select("*").is("deleted_at", null).order("form").order("name")
      .then(({ data }) => setClasses(data || []));
  }, []);

  const filteredClasses = classes.filter(c =>
    c.level === selectedLevel && c.form === parseInt(selectedForm)
  );

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setLoading(true);

    const { data: codeData, error: codeError } = await supabase
      .from("access_codes").select("*").eq("code", accessCode.trim()).eq("used", false).single();

    if (codeError || !codeData) {
      toast({ title: "Invalid Access Code", description: "The code is invalid, expired, or already used.", variant: "destructive" });
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
    await supabase.from("access_codes").update({ used: true, used_by: authData.user.id }).eq("id", codeData.id);

    if (codeData.role === "teacher") {
      await supabase.from("teacher_profiles").insert({ user_id: authData.user.id });
    } else if (codeData.role === "student") {
      await supabase.from("student_profiles").insert({
        user_id: authData.user.id,
        level: selectedLevel as any,
        form: parseInt(selectedForm),
        class_id: selectedClass || null,
        date_of_birth: dateOfBirth || null,
        guardian_name: guardianName || null,
        guardian_phone: guardianPhone || null,
        guardian_email: guardianEmail || null,
        address: address || null,
        national_id: nationalId || null,
      });
      if (phone) {
        await supabase.from("profiles").update({ phone }).eq("user_id", authData.user.id);
      }
    }

    toast({ title: "Account Created!", description: "Welcome to St. Mary's. You can now log in." });
    navigate("/login", { replace: true });
    setLoading(false);
  };

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast({ title: "Required Fields", description: "Please fill in your full name, email, and password.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setRequestLoading(true);

    // Create the auth account immediately
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    });

    if (authError || !authData.user) {
      toast({ title: "Signup Failed", description: authError?.message || "Could not create account.", variant: "destructive" });
      setRequestLoading(false);
      return;
    }

    // Submit application with user_id linked
    const { error } = await supabase.from("applications").insert({
      full_name: fullName,
      email,
      phone: phone || null,
      date_of_birth: dateOfBirth || null,
      level: selectedLevel as any,
      form: parseInt(selectedForm),
      guardian_name: guardianName || null,
      guardian_phone: guardianPhone || null,
      guardian_email: guardianEmail || null,
      address: address || null,
      previous_school: previousSchool || null,
      notes: notes || null,
      user_id: authData.user.id,
    });

    // Sign out since they can't access anything yet (no role)
    await supabase.auth.signOut();

    // Send confirmation email
    try {
      await supabase.functions.invoke("send-notification", {
        body: { type: "request_received", email, full_name: fullName },
      });
    } catch (e) { console.error("Email notification failed:", e); }

    setRequestLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setRequestSubmitted(true);
      toast({ title: "Request Submitted!", description: "Your account has been created. You'll receive an email and can log in once approved." });
    }
  };

  const StudentPersonalFields = () => (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium text-foreground">Phone</label>
          <Input placeholder="+263 7X XXX XXXX" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Date of Birth</label>
          <Input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
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
        <label className="text-sm font-medium text-foreground">National ID / Birth Certificate No.</label>
        <Input placeholder="e.g. 63-123456A78" value={nationalId} onChange={e => setNationalId(e.target.value)} />
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
            <Input placeholder="+263 7X XXX XXXX" value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-sm font-medium text-foreground">Guardian Email</label>
          <Input type="email" placeholder="guardian@example.com" value={guardianEmail} onChange={e => setGuardianEmail(e.target.value)} />
        </div>
      </div>
    </>
  );

  if (requestSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="max-w-md w-full text-center py-8">
          <CardContent>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Request Submitted!</h2>
            <p className="text-muted-foreground mb-4">Your account has been created and your access request has been sent to the administration for review.</p>
            <p className="text-sm text-muted-foreground mb-6">Once approved, you'll be able to log in with your email and password — no access code needed!</p>
            <div className="space-y-3">
              <Link to="/login" className="text-sm text-primary hover:underline block">Go to Login</Link>
              <Link to="/" className="text-sm text-muted-foreground hover:underline block">← Back to website</Link>
            </div>
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
          <p className="text-muted-foreground mt-2">Select your role and register with an access code</p>
        </div>

        {!selectedRole ? (
          <div className="space-y-4">
            {(["student", "teacher", "admin"] as SignupRole[]).map((role) => {
              const config = roleConfig[role];
              return (
                <Card key={role} className={`cursor-pointer transition-all hover:shadow-card-hover border-2 hover:scale-[1.02] ${config.bgColor}`} onClick={() => setSelectedRole(role)}>
                  <CardContent className="flex items-center gap-5 p-6">
                    <div className={`p-4 rounded-xl bg-card shadow-sm ${config.color}`}><config.icon className="w-8 h-8" /></div>
                    <div className="flex-1">
                      <p className="font-display text-xl font-bold text-foreground">Sign Up as {config.label}</p>
                      <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
                    </div>
                    <UserPlus className="w-5 h-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              );
            })}
            <p className="text-center text-sm text-muted-foreground mt-4">You need an access code from the administration to register.</p>
            <div className="text-center mt-4 space-y-2">
              <Link to="/login" className="text-sm text-primary hover:underline">Already have an account? Sign in</Link>
              <Link to="/" className="text-sm text-muted-foreground hover:underline block">← Back to website</Link>
            </div>
          </div>
        ) : (
          <div>
            <button onClick={() => setSelectedRole(null)} className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1">← Choose different role</button>

            {selectedRole === "student" ? (
              <Card className={`shadow-card border-2 ${roleConfig.student.bgColor}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg bg-card shadow-sm ${roleConfig.student.color}`}><GraduationCap className="w-6 h-6" /></div>
                    <div>
                      <CardTitle>Student Registration</CardTitle>
                      <CardDescription>Use an access code or request approval</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="with-code">
                    <TabsList className="w-full mb-4">
                      <TabsTrigger value="with-code" className="flex-1">I Have a Code</TabsTrigger>
                      <TabsTrigger value="request" className="flex-1">Request Access</TabsTrigger>
                    </TabsList>

                    <TabsContent value="with-code">
                      <form onSubmit={handleSignup} className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-foreground">Access Code</label>
                          <Input placeholder="Enter your access code" value={accessCode} onChange={e => setAccessCode(e.target.value)} required autoFocus />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground">Full Name</label>
                          <Input placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} required />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground">Email</label>
                          <Input type="email" placeholder="your.email@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground">Password</label>
                          <Input type="password" placeholder="Minimum 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                        </div>
                        <StudentPersonalFields />
                        <div>
                          <label className="text-sm font-medium text-foreground">Class</label>
                          <select className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                            <option value="">Select class...</option>
                            {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}{c.stream ? ` (${c.stream})` : ""}</option>)}
                          </select>
                          {filteredClasses.length === 0 && <p className="text-xs text-muted-foreground mt-1">No classes available for this level/form.</p>}
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                          {loading ? "Creating account..." : "Create Student Account"}
                        </Button>
                      </form>
                    </TabsContent>

                    <TabsContent value="request">
                      <form onSubmit={handleRequestAccess} className="space-y-4">
                        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                          Don't have an access code? Submit your details for admin approval. Once approved, you can log in immediately — no code needed.
                        </p>
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
                        <StudentPersonalFields />
                        <div>
                          <label className="text-sm font-medium text-foreground">Class</label>
                          <select className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}>
                            <option value="">Select class...</option>
                            {filteredClasses.map(c => <option key={c.id} value={c.id}>{c.name}{c.stream ? ` (${c.stream})` : ""}</option>)}
                          </select>
                          {filteredClasses.length === 0 && <p className="text-xs text-muted-foreground mt-1">No classes available for this level/form.</p>}
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground">Previous School</label>
                          <Input placeholder="Name of previous school" value={previousSchool} onChange={e => setPreviousSchool(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground">Additional Notes</label>
                          <textarea placeholder="Any additional information..." value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm resize-none" />
                        </div>
                        <Button type="submit" className="w-full" disabled={requestLoading}>
                          {requestLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account...</> : <><Send className="w-4 h-4 mr-2" /> Submit & Create Account</>}
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                  <div className="mt-4 text-center">
                    <Link to="/login" className="text-sm text-primary hover:underline">Already have an account? Sign in</Link>
                  </div>
                </CardContent>
              </Card>
            ) : (
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
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground">Access Code</label>
                      <Input placeholder="Enter your access code" value={accessCode} onChange={e => setAccessCode(e.target.value)} required autoFocus />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Full Name</label>
                      <Input placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} required />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Email</label>
                      <Input type="email" placeholder="your.email@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Password</label>
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
