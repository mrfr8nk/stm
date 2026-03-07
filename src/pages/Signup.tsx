import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, GraduationCap, BookOpen, Shield } from "lucide-react";
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
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setLoading(true);

    // 1. Validate access code
    const { data: codeData, error: codeError } = await supabase
      .from("access_codes")
      .select("*")
      .eq("code", accessCode.trim())
      .eq("used", false)
      .single();

    if (codeError || !codeData) {
      toast({ title: "Invalid Access Code", description: "The code is invalid, expired, or already used.", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Check role matches
    if (codeData.role !== selectedRole) {
      toast({ title: "Wrong Code Type", description: `This code is for ${codeData.role}s, not ${selectedRole}s. Please use the correct code.`, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Check expiry
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      toast({ title: "Code Expired", description: "This access code has expired.", variant: "destructive" });
      setLoading(false);
      return;
    }

    // 2. Sign up
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (authError || !authData.user) {
      toast({ title: "Signup Failed", description: authError?.message || "Could not create account.", variant: "destructive" });
      setLoading(false);
      return;
    }

    // 3. Assign role
    await supabase.from("user_roles").insert({ user_id: authData.user.id, role: codeData.role });

    // 4. Mark code used
    await supabase.from("access_codes").update({ used: true, used_by: authData.user.id }).eq("id", codeData.id);

    // 5. Create extended profile
    if (codeData.role === "teacher") {
      await supabase.from("teacher_profiles").insert({ user_id: authData.user.id });
    } else if (codeData.role === "student") {
      await supabase.from("student_profiles").insert({ user_id: authData.user.id, level: "o_level", form: 1 });
    }

    toast({ title: "Account Created!", description: "Welcome to St. Mary's. You can now log in." });
    navigate("/login", { replace: true });
    setLoading(false);
  };

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

        {/* Role Selection */}
        {!selectedRole ? (
          <div className="space-y-4">
            {(["student", "teacher", "admin"] as SignupRole[]).map((role) => {
              const config = roleConfig[role];
              return (
                <Card
                  key={role}
                  className={`cursor-pointer transition-all hover:shadow-card-hover border-2 hover:scale-[1.02] ${config.bgColor}`}
                  onClick={() => setSelectedRole(role)}
                >
                  <CardContent className="flex items-center gap-5 p-6">
                    <div className={`p-4 rounded-xl bg-card shadow-sm ${config.color}`}>
                      <config.icon className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <p className="font-display text-xl font-bold text-foreground">Sign Up as {config.label}</p>
                      <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
                    </div>
                    <UserPlus className="w-5 h-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              );
            })}

            <p className="text-center text-sm text-muted-foreground mt-4">
              You need an access code from the administration to register.
            </p>

            <div className="text-center mt-4 space-y-2">
              <Link to="/login" className="text-sm text-primary hover:underline">
                Already have an account? Sign in
              </Link>
              <Link to="/" className="text-sm text-muted-foreground hover:underline block">
                ← Back to website
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <button
              onClick={() => setSelectedRole(null)}
              className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
            >
              ← Choose different role
            </button>

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
                    <Input placeholder="Enter your access code" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} required autoFocus />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Full Name</label>
                    <Input placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <Input type="email" placeholder="your.email@stmaryshigh.edu.zw" value={email} onChange={(e) => setEmail(e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <Input type="password" placeholder="Minimum 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
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

            <Link to="/" className="text-sm text-muted-foreground hover:underline block text-center mt-4">← Back to website</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Signup;
