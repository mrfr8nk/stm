import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, LogIn, Shield, BookOpen, Users } from "lucide-react";
import schoolLogo from "@/assets/school-logo.png";

type PortalType = "student" | "teacher" | "admin";

const portalConfig: Record<PortalType, { label: string; icon: React.ElementType; description: string; color: string; bgColor: string }> = {
  student: { label: "Student", icon: GraduationCap, description: "View grades, attendance & reports", color: "text-accent", bgColor: "bg-accent/10 border-accent/30" },
  teacher: { label: "Teacher", icon: BookOpen, description: "Manage classes, grades & attendance", color: "text-secondary", bgColor: "bg-secondary/10 border-secondary/30" },
  admin: { label: "Administrator", icon: Shield, description: "Full system management access", color: "text-primary", bgColor: "bg-primary/10 border-primary/30" },
};

const Login = () => {
  const [selectedPortal, setSelectedPortal] = useState<PortalType | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPortal) return;
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    // Verify role matches selected portal
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .limit(1)
      .single();

    const userRole = roleData?.role;

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
            {(["student", "teacher", "admin"] as PortalType[]).map((portal) => {
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

            <div className="text-center mt-6 space-y-2">
              <Link to="/signup" className="text-sm text-primary hover:underline">
                Don't have an account? Sign up with access code
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
                    <label className="text-sm font-medium text-foreground">Email</label>
                    <Input
                      type="email"
                      placeholder="your.email@stmaryshigh.edu.zw"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                </form>
                <div className="mt-4 text-center">
                  <Link to="/signup" className="text-sm text-primary hover:underline">
                    Create an account with access code
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
