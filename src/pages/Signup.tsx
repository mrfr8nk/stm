import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";

const Signup = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
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

    // Check expiry
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      toast({ title: "Code Expired", description: "This access code has expired.", variant: "destructive" });
      setLoading(false);
      return;
    }

    // 2. Sign up user
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
    await supabase.from("user_roles").insert({
      user_id: authData.user.id,
      role: codeData.role,
    });

    // 4. Mark code as used
    await supabase.from("access_codes").update({
      used: true,
      used_by: authData.user.id,
    }).eq("id", codeData.id);

    // 5. Create extended profile based on role
    if (codeData.role === "teacher") {
      await supabase.from("teacher_profiles").insert({ user_id: authData.user.id });
    } else if (codeData.role === "student") {
      await supabase.from("student_profiles").insert({
        user_id: authData.user.id,
        level: "o_level",
        form: 1,
      });
    }

    toast({ title: "Account Created!", description: "Welcome to St. Mary's. You can now log in." });
    navigate("/login", { replace: true });
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-4">
            <img src={schoolLogo} alt="St. Mary's" className="h-16 w-16 object-contain" />
          </Link>
          <h1 className="font-display text-3xl font-bold text-primary">Create Account</h1>
          <p className="text-muted-foreground mt-2">Use your access code to register</p>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> Sign Up
            </CardTitle>
            <CardDescription>You need an access code from administration</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Access Code</label>
                <Input
                  placeholder="Enter your access code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Full Name</label>
                <Input
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="your.email@stmaryshigh.edu.zw"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Password</label>
                <Input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
            <div className="mt-6 text-center space-y-2">
              <Link to="/login" className="text-sm text-primary hover:underline">
                Already have an account? Sign in
              </Link>
              <Link to="/" className="text-sm text-muted-foreground hover:underline block">
                ← Back to website
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
