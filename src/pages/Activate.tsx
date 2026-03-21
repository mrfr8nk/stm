import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, User, Lock, GraduationCap, BookOpen, Mail, Phone, Calendar, MapPin, Shield } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import PhoneInput from "@/components/PhoneInput";

const Activate = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "expired" | "used" | "success">("loading");
  const [invitation, setInvitation] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [guardianEmail, setGuardianEmail] = useState("");

  // For students - class selection
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("o_level");
  const [selectedForm, setSelectedForm] = useState("1");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    verifyToken();
    loadClasses();
  }, [token]);

  const verifyToken = async () => {
    const { data, error } = await supabase
      .from("pending_invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (error || !data) {
      setStatus("invalid");
      return;
    }

    if (data.status === "activated") {
      setStatus("used");
      return;
    }

    if (new Date(data.expires_at) < new Date()) {
      setStatus("expired");
      return;
    }

    setInvitation(data);
    if (data.class_name) {
      // Try to parse level and form from class name
      const match = data.class_name.match(/Form\s*(\d)/i);
      if (match) {
        const form = parseInt(match[1]);
        setSelectedForm(form.toString());
        if (form <= 2) setSelectedLevel("zjc");
        else if (form <= 4) setSelectedLevel("o_level");
        else setSelectedLevel("a_level");
      }
    }
    setStatus("valid");
  };

  const loadClasses = async () => {
    const { data } = await supabase
      .from("classes")
      .select("*")
      .is("deleted_at", null)
      .order("form")
      .order("name");
    setClasses(data || []);
  };

  const filteredClasses = useMemo(() =>
    classes.filter(c => c.level === selectedLevel && c.form === parseInt(selectedForm)),
    [classes, selectedLevel, selectedForm]
  );

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast({ title: "Required", description: "Please enter your full name.", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Weak Password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Passwords Don't Match", description: "Please confirm your password.", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (authError || !authData.user) {
        throw new Error(authError?.message || "Could not create account.");
      }

      // Assign role
      await supabase.from("user_roles").insert({ 
        user_id: authData.user.id, 
        role: invitation.role 
      });

      // Create profile based on role
      if (invitation.role === "student") {
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
      } else if (invitation.role === "teacher") {
        await supabase.from("teacher_profiles").insert({
          user_id: authData.user.id,
        });
      }

      // Update phone if provided
      if (phone) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await supabase.from("profiles").update({ phone }).eq("user_id", authData.user.id);
      }

      // Mark invitation as activated
      await supabase
        .from("pending_invitations")
        .update({ 
          status: "activated", 
          activated_at: new Date().toISOString(),
          user_id: authData.user.id,
        })
        .eq("id", invitation.id);

      // Send welcome email
      supabase.functions.invoke("send-branded-email", {
        body: { 
          email: invitation.email, 
          type: "welcome", 
          welcome_data: { name: fullName, role: invitation.role } 
        },
      }).catch(() => {});

      setStatus("success");
      toast({ title: "Account Activated!", description: "Your account has been set up successfully." });

      // Redirect to login after a short delay
      setTimeout(() => navigate("/login", { replace: true }), 3000);

    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setSubmitting(false);
    }
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying invitation...</p>
        </div>
      </div>
    );
  }

  // Invalid/expired/used states
  if (status === "invalid" || status === "expired" || status === "used") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md shadow-card border-2">
          <CardContent className="pt-8 pb-8 text-center">
            <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              {status === "invalid" && "Invalid Invitation"}
              {status === "expired" && "Invitation Expired"}
              {status === "used" && "Already Activated"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {status === "invalid" && "This invitation link is invalid or doesn't exist."}
              {status === "expired" && "This invitation has expired. Please contact the administrator for a new invitation."}
              {status === "used" && "This invitation has already been used to create an account."}
            </p>
            <Button onClick={() => navigate("/login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md shadow-card border-2">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Account Activated!</h2>
            <p className="text-muted-foreground mb-4">
              Your account has been set up successfully. Redirecting to login...
            </p>
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid invitation - show activation form
  const isStudent = invitation?.role === "student";
  const isTeacher = invitation?.role === "teacher";
  const RoleIcon = isStudent ? GraduationCap : isTeacher ? BookOpen : Shield;
  const roleLabel = isStudent ? "Student" : isTeacher ? "Teacher" : invitation?.role;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <img src={schoolLogo} alt="St. Mary's" className="h-16 w-16 object-contain mx-auto mb-3" />
          <h1 className="font-display text-2xl font-bold text-primary">Activate Your Account</h1>
          <p className="text-sm text-muted-foreground">Complete your registration for St. Mary's High School</p>
        </div>

        <Card className="shadow-card border-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${isStudent ? "bg-accent/10" : isTeacher ? "bg-secondary/10" : "bg-primary/10"}`}>
                <RoleIcon className={`h-6 w-6 ${isStudent ? "text-accent" : isTeacher ? "text-secondary" : "text-primary"}`} />
              </div>
              <div>
                <CardTitle className="text-lg">{roleLabel} Registration</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {invitation?.email}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleActivate} className="space-y-4">
              {/* Basic Info */}
              <div>
                <label className="text-sm font-medium text-foreground flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> Full Name *
                </label>
                <Input 
                  placeholder="Enter your full name" 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground flex items-center gap-1">
                    <Lock className="h-3.5 w-3.5" /> Password *
                  </label>
                  <Input 
                    type="password" 
                    placeholder="Min. 6 characters" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    required 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Confirm Password *</label>
                  <Input 
                    type="password" 
                    placeholder="Confirm password" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> Phone
                  </label>
                  <PhoneInput value={phone} onChange={setPhone} />
                </div>
                {isStudent && (
                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> Date of Birth
                    </label>
                    <Input type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} />
                  </div>
                )}
              </div>

              {/* Student-specific fields */}
              {isStudent && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-foreground">Gender</label>
                      <select 
                        className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm" 
                        value={gender} 
                        onChange={e => setGender(e.target.value)}
                      >
                        <option value="">Select...</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">National ID / Birth Cert</label>
                      <Input 
                        placeholder="e.g. 63-123456A78" 
                        value={nationalId} 
                        onChange={e => setNationalId(e.target.value)} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-foreground">Level</label>
                      <select 
                        className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm" 
                        value={selectedLevel} 
                        onChange={e => { 
                          setSelectedLevel(e.target.value); 
                          setSelectedClass(""); 
                          setSelectedForm(e.target.value === "a_level" ? "5" : "1"); 
                        }}
                      >
                        <option value="zjc">ZJC (Form 1-2)</option>
                        <option value="o_level">O Level (Form 1-4)</option>
                        <option value="a_level">A Level (Form 5-6)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground">Form</label>
                      <select 
                        className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm" 
                        value={selectedForm} 
                        onChange={e => { setSelectedForm(e.target.value); setSelectedClass(""); }}
                      >
                        {(selectedLevel === "zjc" ? [1, 2] : selectedLevel === "o_level" ? [1, 2, 3, 4] : [5, 6]).map(f => 
                          <option key={f} value={f}>Form {f}</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {filteredClasses.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-foreground">Class</label>
                      <select 
                        className="w-full border border-input rounded-lg px-3 py-2 bg-background text-sm" 
                        value={selectedClass} 
                        onChange={e => setSelectedClass(e.target.value)}
                      >
                        <option value="">Select class...</option>
                        {filteredClasses.map(c => 
                          <option key={c.id} value={c.id}>{c.name}{c.stream ? ` (${c.stream})` : ""}</option>
                        )}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-foreground flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> Home Address
                    </label>
                    <Input 
                      placeholder="Full home address" 
                      value={address} 
                      onChange={e => setAddress(e.target.value)} 
                    />
                  </div>

                  <div className="border-t border-border pt-3">
                    <p className="text-sm font-semibold text-foreground mb-2">Guardian / Parent Information</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-foreground">Guardian Name</label>
                        <Input 
                          placeholder="Full name" 
                          value={guardianName} 
                          onChange={e => setGuardianName(e.target.value)} 
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground">Guardian Phone</label>
                        <PhoneInput value={guardianPhone} onChange={setGuardianPhone} />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="text-sm font-medium text-foreground">Guardian Email</label>
                      <Input 
                        type="email" 
                        placeholder="guardian@example.com" 
                        value={guardianEmail} 
                        onChange={e => setGuardianEmail(e.target.value)} 
                      />
                    </div>
                  </div>
                </>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Activate Account
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Already have an account?{" "}
          <a href="/login" className="text-primary hover:underline">Log in</a>
        </p>
      </div>
    </div>
  );
};

export default Activate;
