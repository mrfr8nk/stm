import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, LogIn, Shield, BookOpen, Users, Loader2, Fingerprint } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";
import { isPlatformAuthenticatorAvailable, authenticateWithPasskey } from "@/lib/passkey";

type PortalType = "student" | "teacher" | "admin" | "parent";

const portalConfig: Record<PortalType, { label: string; icon: React.ElementType; description: string; color: string; bgColor: string }> = {
  student: { label: "Student", icon: GraduationCap, description: "View grades, attendance & reports", color: "text-accent", bgColor: "bg-accent/10 border-accent/30" },
  teacher: { label: "Teacher", icon: BookOpen, description: "Manage classes, grades & attendance", color: "text-secondary", bgColor: "bg-secondary/10 border-secondary/30" },
  parent: { label: "Parent", icon: Users, description: "Monitor your child's academic progress", color: "text-amber-600", bgColor: "bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800/30" },
  admin: { label: "Administrator", icon: Shield, description: "Full system management access", color: "text-primary", bgColor: "bg-primary/10 border-primary/30" },
};

const Login = () => {
  const [selectedPortal, setSelectedPortal] = useState<PortalType | null>(null);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    isPlatformAuthenticatorAvailable().then(setBiometricAvailable);
  }, []);

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    try {
      const credentialId = await authenticateWithPasskey();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/passkey-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ action: "authenticate", credential_id: credentialId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Authentication failed");

      const { error } = await supabase.auth.verifyOtp({
        token_hash: result.token_hash,
        type: "magiclink",
      });
      if (error) throw error;

      navigate(`/${result.role || "student"}`, { replace: true });
    } catch (err: any) {
      if (err.name !== "NotAllowedError") {
        toast({ title: "Biometric Login Failed", description: err.message || "Could not authenticate.", variant: "destructive" });
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) {
      toast({ title: "Google Sign-In Failed", description: error.message || "Could not sign in with Google.", variant: "destructive" });
      setGoogleLoading(false);
    }
  };

  const resolveEmail = async (input: string): Promise<string | null> => {
    const trimmed = input.trim();
    // If it looks like a student ID (e.g. STM20260001), look up the email
    if (/^STM\d+$/i.test(trimmed)) {
      const { data: sp } = await supabase
        .from("student_profiles")
        .select("user_id")
        .ilike("student_id", trimmed)
        .limit(1)
        .single();
      if (!sp) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", sp.user_id)
        .single();
      return profile?.email || null;
    }
    return trimmed;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPortal) return;
    setLoading(true);

    const email = await resolveEmail(loginId);
    if (!email) {
      toast({ title: "Login Failed", description: "Student ID not found. Please check and try again.", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .limit(1)
      .single();

    const userRole = roleData?.role;

    if (!userRole) {
      // No role assigned — check if they have a pending application
      const { data: appData } = await supabase
        .from("applications")
        .select("status")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      await supabase.auth.signOut();

      if (appData?.status === "pending") {
        toast({
          title: "Application Pending",
          description: "Your application is still under review. You will receive an email once a decision is made. Please be patient.",
        });
      } else if (appData?.status === "rejected") {
        toast({
          title: "Application Rejected",
          description: "Unfortunately, your application was not approved. Please contact the school administration for more information.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Account Not Activated",
          description: "Your account has not been assigned a role yet. Please contact the school administration.",
          variant: "destructive",
        });
      }
      setLoading(false);
      return;
    }

    if (userRole !== selectedPortal) {
      await supabase.auth.signOut();
      toast({
        title: "Access Denied",
        description: `Your account is not registered as ${selectedPortal === "admin" ? "an" : "a"} ${selectedPortal}. Please select the correct portal.`,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    navigate(`/${userRole}`, { replace: true });
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-4">
            <img src={schoolLogo} alt="St. Mary's" className="h-20 w-20 object-contain mx-auto" />
          </Link>
          <h1 className="font-display text-3xl font-bold text-primary">St. Mary's Portal</h1>
          <p className="text-muted-foreground mt-2">Select your portal to sign in</p>
        </div>

        {/* Portal Selection */}
        {!selectedPortal ? (
          <div className="space-y-4">
            {(["student", "teacher", "parent", "admin"] as PortalType[]).map((portal) => {
              const config = portalConfig[portal];
              return (
                <Card
                  key={portal}
                  className={`cursor-pointer transition-all hover:shadow-card-hover border-2 hover:scale-[1.02] ${config.bgColor}`}
                  onClick={() => setSelectedPortal(portal)}
                >
                  <CardContent className="flex items-center gap-5 p-6">
                    <div className={`p-4 rounded-xl bg-card shadow-sm ${config.color}`}>
                      <config.icon className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <p className="font-display text-xl font-bold text-foreground">{config.label} Portal</p>
                      <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
                    </div>
                    <LogIn className="w-5 h-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              );
            })}

            {biometricAvailable && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full border-2 border-dashed border-primary/30 hover:border-primary/60"
                  onClick={handleBiometricLogin}
                  disabled={biometricLoading}
                >
                  {biometricLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Fingerprint className="w-5 h-5 mr-2 text-primary" />}
                  Sign in with Biometrics
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-1">Use fingerprint or face scan</p>
              </div>
            )}

            <div className="text-center mt-6 space-y-2">
              <Link to="/signup" className="text-sm text-primary hover:underline">
                Don't have an account? Sign up
              </Link>
              <Link to="/" className="text-sm text-muted-foreground hover:underline block">
                ← Back to website
              </Link>
            </div>
          </div>
        ) : (
          /* Login Form */
          <div>
            <button
              onClick={() => setSelectedPortal(null)}
              className="text-sm text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
            >
              ← Choose different portal
            </button>

            <Card className={`shadow-card border-2 ${portalConfig[selectedPortal].bgColor}`}>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg bg-card shadow-sm ${portalConfig[selectedPortal].color}`}>
                    {(() => { const Icon = portalConfig[selectedPortal].icon; return <Icon className="w-6 h-6" />; })()}
                  </div>
                  <div>
                    <CardTitle>{portalConfig[selectedPortal].label} Login</CardTitle>
                    <CardDescription>{portalConfig[selectedPortal].description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      {selectedPortal === "student" ? "Email or Student ID" : "Email"}
                    </label>
                    <Input
                      type="text"
                      placeholder={selectedPortal === "student" ? "email or STM20260001" : "your.email@stmaryshigh.edu.zw"}
                      value={loginId}
                      onChange={(e) => setLoginId(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <Input
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Signing in..." : `Sign In as ${portalConfig[selectedPortal].label}`}
                  </Button>

                  {(selectedPortal === "student" || selectedPortal === "parent") && (
                    <>
                      <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or</span></div>
                      </div>
                      <Button type="button" variant="outline" className="w-full" disabled={googleLoading} onClick={handleGoogleSignIn}>
                        {googleLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : (
                          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                        )}
                        Sign in with Google
                      </Button>
                    </>
                  )}
                </form>
                <div className="mt-4 text-center space-y-2">
                  <Link to="/forgot-password" className="text-sm text-muted-foreground hover:underline block">
                    Forgot your password?
                  </Link>
                  <Link to="/signup" className="text-sm text-primary hover:underline block">
                    Don't have an account? Sign up
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Link to="/" className="text-sm text-muted-foreground hover:underline block text-center mt-4">
              ← Back to website
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
